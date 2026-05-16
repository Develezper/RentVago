import type { ScrapedPropertyInput } from "@/modules/admin/domain/admin.types";
import {
  clampLimit,
  collectImageUrls,
  getApifyApiToken,
  getFirstNonEmptyString,
  getFirstNonEmptyText,
  getFirstPositiveInteger,
  isJsonObject,
  parsePriceAmount,
} from "@/modules/admin/infrastructure/apify-shared";

const APIFY_FACEBOOK_SCRAPER_ENDPOINT =
  "https://api.apify.com/v2/acts/apify~facebook-marketplace-scraper/run-sync-get-dataset-items";
const DEFAULT_APIFY_RESULTS_LIMIT = 10;
const MAX_APIFY_RESULTS_LIMIT = 50;
const APIFY_REQUEST_TIMEOUT_MS = 90_000;

interface ApifyFacebookItem {
  [key: string]: unknown;
}

const cleanDescription = (value: string): string => {
  const withoutHiddenMarkers = value
    .replace(/\+?\d{1,4}[\s\-()]*\[\s*hidden information\s*\]/gi, "")
    .replace(/\[\s*hidden information\s*\]/gi, "")
    .replace(/\bhidden information\b/gi, "");

  return withoutHiddenMarkers
    .split(/\r?\n/)
    .map((line) => line.replace(/[ \t]{2,}/g, " ").trim())
    .filter((line) => {
      if (line.length === 0) {
        return false;
      }

      if (/^\+?\d{1,4}[\s\-.,:;]*$/.test(line)) {
        return false;
      }

      if (
        /^(?:whats?app|wa|cel(?:ular)?|tel(?:efono)?|telefono|contacto)\s*[:\-]?\s*(?:\+?\d{1,4})?[\s\-.,:;]*$/i.test(
          line,
        )
      ) {
        return false;
      }

      return true;
    })
    .join("\n")
    .trim();
};

const FB_IMAGE_COLLECTION_PATHS = [
  "listingPhotos",
  "listingPhotos.nodes",
  "listingPhotos.edges",
  "listing_photos",
  "listing_photos.nodes",
  "listing_photos.edges",
  "listing_media",
  "listingMedia",
  "all_photos",
  "all_photos.nodes",
  "allPhotos",
  "allPhotos.nodes",
  "photos",
  "photo_urls",
  "photoUrls",
  "photo_gallery",
  "photoGallery",
  "gallery",
  "images",
  "image_urls",
  "imageUrls",
  "media",
  "media.items",
  "media.nodes",
  "all_listing_photos",
  "allListingPhotos",
  "listing_details.photos",
  "listing_details.images",
  "listingDetails.photos",
  "listingDetails.images",
  "primary_listing_photo",
  "primaryListingPhoto",
  "primaryPhoto",
];

const FB_IMAGE_SCALAR_PATHS = [
  "photo_image_url", "photoImageUrl", "photo_url", "photoUrl",
  "node.photo_image_url", "node.photoImageUrl", "node.photo_url", "node.photoUrl",
  "image_url", "imageUrl", "image.url", "image.uri", "image.src", "image.original", "image.large",
  "node.image_url", "node.imageUrl", "node.image.url", "node.image.uri",
  "node.image.src", "node.image.original", "node.image.large",
  "image_uri", "imageUri", "node.image_uri", "node.imageUri",
  "src", "source", "thumbnail", "thumbnail_url", "thumbnailUrl",
  "node.thumbnail", "node.thumbnail_url", "node.thumbnailUrl",
  "preview_image_url", "previewImageUrl",
  "original_image_url", "originalImageUrl",
  "display_image_url", "displayImageUrl",
  "uri", "url", "node.uri", "original", "large",
];

const collectListingImageUrls = (item: ApifyFacebookItem): string[] =>
  collectImageUrls(item, FB_IMAGE_COLLECTION_PATHS, FB_IMAGE_SCALAR_PATHS);


type CityMapping = {
  canonical: string;
  aliases: string[];
};

const VALLE_DE_ABURRA_CITY_MAPPINGS: CityMapping[] = [
  { canonical: "Medellín", aliases: ["medellin", "medellín"] },
  { canonical: "Itagüí", aliases: ["itagui", "itagüi"] },
  { canonical: "Sabaneta", aliases: ["sabaneta"] },
  { canonical: "Envigado", aliases: ["envigado"] },
];

const escapeRegExp = (value: string): string => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const normalizeSearchText = (value: string): string => {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
};

export const resolveCanonicalCity = (value: string): string | undefined => {
  const normalized = normalizeSearchText(value);

  for (const mapping of VALLE_DE_ABURRA_CITY_MAPPINGS) {
    for (const alias of mapping.aliases) {
      const aliasPattern = new RegExp(`\\b${escapeRegExp(alias)}\\b`, "i");
      if (aliasPattern.test(normalized)) {
        return mapping.canonical;
      }
    }
  }

  return undefined;
};


export const extractRoomsFromDescription = (description: string): number | undefined => {
  const match = description.match(
    /\b(\d{1,2})\s*(?:habitaciones?|alcobas?|piezas?|hab(?:\.|itaciones?)?)\b/i,
  );

  if (!match) {
    return undefined;
  }

  const parsed = Number.parseInt(match[1], 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};

const normalizeLocationSegment = (value: string): string => {
  return value.replace(/\s+/g, " ").replace(/^[,.:;\-]+|[,.:;\-]+$/g, "").trim();
};

const toNeighborhoodCandidate = (rawValue: string): string | undefined => {
  const firstSegment = rawValue.split(/[,;\n\r\.]/)[0] ?? "";
  const normalized = normalizeLocationSegment(firstSegment);

  if (normalized.length < 2) {
    return undefined;
  }

  if (resolveCanonicalCity(normalized)) {
    return undefined;
  }

  const invalidStarts = [
    "arriendo",
    "arrendando",
    "venta",
    "vendo",
    "alquiler",
    "apartamento",
    "casa",
    "habitacion",
    "habitaciones",
    "unidad",
    "conjunto",
  ];
  const normalizedStart = normalizeSearchText(normalized);

  if (invalidStarts.some((token) => normalizedStart.startsWith(`${token} `) || normalizedStart === token)) {
    return undefined;
  }

  if (normalized.length > 55) {
    return undefined;
  }

  const invalidContains = [
    "cuenta con",
    "habitacion",
    "habitaciones",
    "alcoba",
    "alcobas",
    "bano",
    "bano",
    "baño",
    "baños",
    "parqueadero",
    "porteria",
    "piscina",
    "gimnasio",
    "cocina",
    "balcon",
    "balcon",
    "balcón",
    "unidad completa",
    "servicio",
  ];

  if (invalidContains.some((token) => normalizedStart.includes(token))) {
    return undefined;
  }

  return normalized;
};

export const extractNeighborhoodFromDescription = (description: string): string | undefined => {
  const patterns = [
    /\bbarrio\s+([a-zA-ZÀ-ÿ0-9][a-zA-ZÀ-ÿ0-9\s\-]{1,60})/i,
    /\bsector\s+([a-zA-ZÀ-ÿ0-9][a-zA-ZÀ-ÿ0-9\s\-]{1,60})/i,
    /\burbanizaci[oó]n\s+([a-zA-ZÀ-ÿ0-9][a-zA-ZÀ-ÿ0-9\s\-]{1,60})/i,
  ];

  for (const pattern of patterns) {
    const match = description.match(pattern);
    if (!match) {
      continue;
    }

    const candidate = toNeighborhoodCandidate(match[1]);
    if (candidate) {
      return candidate;
    }
  }

  return undefined;
};

export const extractNeighborhoodFromTitle = (title: string): string | undefined => {
  const normalizedTitle = title.trim();

  const explicitPattern =
    /\b(?:barrio|sector|urbanizaci[oó]n)\s+([a-zA-ZÀ-ÿ0-9][a-zA-ZÀ-ÿ0-9\s\-]{1,80})/i;
  const explicitMatch = normalizedTitle.match(explicitPattern);
  if (explicitMatch) {
    const explicitCandidate = toNeighborhoodCandidate(explicitMatch[1]);
    if (explicitCandidate) {
      return explicitCandidate;
    }
  }

  const enWithDelimiterPattern =
    /\ben\s+([a-zA-ZÀ-ÿ0-9][a-zA-ZÀ-ÿ0-9\s\-]{1,80}?)(?=\s+(?:\d{1,2}\s*(?:alcobas?|habitaciones?|ba(?:n|ñ)os?)|con\b|para\b|y\b|en\b|unidad\b|servicios?\b|$)|[.,;()])/i;
  const enWithDelimiterMatch = normalizedTitle.match(enWithDelimiterPattern);
  if (enWithDelimiterMatch) {
    const delimitedCandidate = toNeighborhoodCandidate(enWithDelimiterMatch[1]);
    if (delimitedCandidate) {
      return delimitedCandidate;
    }
  }

  const startsWithRentVerbPattern =
    /^(?:se\s+arrienda|arriendo|arrienda|apto\s+arriendo|apartamento\s+en\s+arriendo|apartamento\s+arriendo)\s+([a-zA-ZÀ-ÿ0-9][a-zA-ZÀ-ÿ0-9\s\-]{2,80})$/i;
  const startsWithRentVerbMatch = normalizedTitle.match(startsWithRentVerbPattern);
  if (startsWithRentVerbMatch) {
    const rentVerbCandidate = toNeighborhoodCandidate(startsWithRentVerbMatch[1]);
    if (rentVerbCandidate) {
      return rentVerbCandidate;
    }
  }

  const trailingEnPattern =
    /\ben\s+(?!.*\ben\s+)([a-zA-ZÀ-ÿ0-9][a-zA-ZÀ-ÿ0-9\s\-]{1,80})$/i;
  const trailingMatch = normalizedTitle.match(trailingEnPattern);
  if (!trailingMatch) {
    return undefined;
  }

  return toNeighborhoodCandidate(trailingMatch[1]);
};

const composeLocationLabel = (
  fallbackLocation: string,
  city: string | undefined,
  neighborhood: string | undefined,
): string => {
  if (neighborhood && city) {
    return `${neighborhood}, ${city}`;
  }

  if (neighborhood) {
    return neighborhood;
  }

  if (city) {
    return city;
  }

  return fallbackLocation;
};


export const runFacebookScraper = async (
  city: string,
  count = DEFAULT_APIFY_RESULTS_LIMIT,
): Promise<ScrapedPropertyInput[]> => {
  const normalizedCity = city.trim();
  const resultsLimit = clampLimit(count, MAX_APIFY_RESULTS_LIMIT);
  const encodedCity = encodeURIComponent(normalizedCity);
  const targetUrl = `https://web.facebook.com/marketplace/112307505452766/search/?query=arriendos%20${encodedCity}`;
  const apifyToken = getApifyApiToken();

  console.info(
    `[scraper] Ejecutando preview/sync de Facebook Marketplace para "${normalizedCity}" con límite ${resultsLimit}.`,
  );

  const response = await fetch(
    `${APIFY_FACEBOOK_SCRAPER_ENDPOINT}?token=${encodeURIComponent(apifyToken)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        includeListingDetails: true,
        getListingDetails: true,
        getAllListingPhotos: true,
        resultsLimit,
        maxItems: resultsLimit,
        startUrls: [{ url: targetUrl }],
      }),
      signal: AbortSignal.timeout(APIFY_REQUEST_TIMEOUT_MS),
    },
  ).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Error de red desconocido";
    throw new Error(`No se pudo conectar con Apify: ${message}`);
  });

  if (!response.ok) {
    const responseText = await response.text().catch(() => "");
    throw new Error(
      `Apify respondió con error ${response.status}${responseText ? `: ${responseText}` : ""}`,
    );
  }

  const data: unknown = await response.json();

  if (!Array.isArray(data)) {
    throw new Error("La respuesta de Apify no tiene el formato esperado.");
  }

  return data
    .map((rawItem) => {
      const item = rawItem as ApifyFacebookItem;
      const title = getFirstNonEmptyString(item, [
        "listingTitle",
        "listing_title",
        "marketplace_listing_title",
        "custom_title",
        "title",
      ]);
      const rawDescription =
        getFirstNonEmptyText(item, [
          "description.text",
          "description",
          "listing_description.text",
          "listingDescription.text",
          "listingDescription",
          "listing_description_text",
          "listing_description",
          "detailed_description.text",
          "detailed_description",
          "detailedDescription",
          "detailedDescription.text",
          "detailedDescription",
          "listing_details.description.text",
          "marketplace_listing_description_with_entities.text",
          "marketplaceListingDescriptionWithEntities.text",
          "listing_details.description",
          "listingDetails.description",
          "marketplace_listing_description",
          "description",
        ]) || title;
      const description = cleanDescription(rawDescription) || title;
      const cityMetadataRaw = getFirstNonEmptyString(item, [
        "location.reverse_geocode.city",
        "location.reverseGeocode.city",
        "location.city",
        "reverse_geocode.city",
        "city",
      ]);
      const fallbackLocation =
        getFirstNonEmptyString(item, [
          "location.reverse_geocode.name",
          "location.reverseGeocode.name",
          "location.name",
          "location.full_name",
          "location.fullName",
          "marketplace_listing_location.name",
          "marketplaceListingLocation.name",
        ]) || cityMetadataRaw || normalizedCity;
      const cityFromDescription = resolveCanonicalCity(description);
      const cityFromTitle = resolveCanonicalCity(title);
      const cityFromMetadata = resolveCanonicalCity(cityMetadataRaw);
      const cityFromSearch = resolveCanonicalCity(normalizedCity);
      const fallbackCity = cityMetadataRaw || normalizedCity;
      const mappedCity =
        cityFromDescription ?? cityFromTitle ?? cityFromMetadata ?? cityFromSearch ?? fallbackCity;
      const neighborhoodFromMetadata = getFirstNonEmptyString(item, [
        "location.reverse_geocode.neighborhood",
        "location.reverseGeocode.neighborhood",
        "location.neighborhood",
        "reverse_geocode.neighborhood",
        "neighborhood",
        "location.reverse_geocode.borough",
        "location.reverseGeocode.borough",
      ]);
      const neighborhoodFromDescription = extractNeighborhoodFromDescription(description);
      const neighborhoodFromTitle = extractNeighborhoodFromTitle(title);
      const mappedNeighborhood =
        neighborhoodFromDescription ??
        neighborhoodFromTitle ??
        (neighborhoodFromMetadata ? normalizeLocationSegment(neighborhoodFromMetadata) : undefined);
      const roomsFromMetadata = getFirstPositiveInteger(item, [
        "bedrooms",
        "rooms",
        "room_count",
        "listing_details.bedrooms",
        "listingDetails.bedrooms",
        "listing_details.rooms",
        "listingDetails.rooms",
        "property_info.bedrooms",
        "propertyInfo.bedrooms",
        "attributes.bedrooms",
        "features.bedrooms",
      ]);
      const mappedRooms =
        roomsFromMetadata ?? extractRoomsFromDescription(description) ?? extractRoomsFromDescription(title);
      const mappedLocation = composeLocationLabel(
        normalizeLocationSegment(fallbackLocation),
        mappedCity,
        mappedNeighborhood,
      );
      const imageUrls = collectListingImageUrls(item);
      const sourceUrl = getFirstNonEmptyString(item, [
        "itemUrl",
        "item_url",
        "listingUrl",
        "listing_url",
        "marketplace_listing_url",
        "url",
      ]);

      const amount =
        getFirstNonEmptyString(item, [
          "listing_price.amount",
          "listingPrice.amount",
          "listing_price.formatted_amount",
          "listingPrice.formatted_amount",
          "price.amount",
          "price",
        ]) || undefined;

      return {
        title,
        description,
        price: parsePriceAmount(amount),
        location: mappedLocation,
        city: mappedCity,
        neighborhood: mappedNeighborhood,
        rooms: mappedRooms,
        imageUrls,
        sourceUrl,
      } satisfies ScrapedPropertyInput;
    })
    .filter((item) => item.title.length > 0 && item.sourceUrl.length > 0)
    .slice(0, resultsLimit);
};
