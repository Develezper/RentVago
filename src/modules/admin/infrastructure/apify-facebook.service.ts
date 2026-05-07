import type { ScrapedPropertyInput } from "@/modules/admin/domain/admin.types";

const APIFY_FACEBOOK_SCRAPER_ENDPOINT =
  "https://api.apify.com/v2/acts/apify~facebook-marketplace-scraper/run-sync-get-dataset-items";
const APIFY_RESULTS_LIMIT = 10;
const APIFY_REQUEST_TIMEOUT_MS = 90_000;

interface ApifyFacebookItem {
  [key: string]: unknown;
}

type JsonObject = Record<string, unknown>;

const isJsonObject = (value: unknown): value is JsonObject => {
  return typeof value === "object" && value !== null;
};

const getNestedValue = (source: unknown, path: string): unknown => {
  if (!isJsonObject(source)) {
    return undefined;
  }

  const directValue = source[path];
  if (directValue !== undefined) {
    return directValue;
  }

  return path.split(".").reduce<unknown>((current, segment) => {
    if (!isJsonObject(current)) {
      return undefined;
    }

    return current[segment];
  }, source);
};

const getFirstNonEmptyString = (source: unknown, paths: string[]): string => {
  for (const path of paths) {
    const value = getNestedValue(source, path);
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return "";
};

const getFirstNonEmptyText = (source: unknown, paths: string[]): string => {
  for (const path of paths) {
    const value = getNestedValue(source, path);

    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }

    if (!isJsonObject(value)) {
      continue;
    }

    const nestedText = getFirstNonEmptyString(value, [
      "text",
      "description",
      "value",
      "content",
      "message",
      "body",
    ]);

    if (nestedText.length > 0) {
      return nestedText;
    }
  }

  return "";
};

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

const isValidHttpUrl = (value: string): boolean => {
  return /^https?:\/\//i.test(value);
};

const collectListingImageUrls = (item: ApifyFacebookItem): string[] => {
  const imageUrls: string[] = [];
  const seen = new Set<string>();

  const pushUrl = (value: string) => {
    const normalized = value.trim();
    if (!isValidHttpUrl(normalized) || seen.has(normalized)) {
      return;
    }
    seen.add(normalized);
    imageUrls.push(normalized);
  };

  const collectFromUnknown = (value: unknown) => {
    if (typeof value === "string") {
      pushUrl(value);
      return;
    }

    if (Array.isArray(value)) {
      value.forEach(collectFromUnknown);
      return;
    }

    if (!isJsonObject(value)) {
      return;
    }

    const photoObjectCandidatePaths = [
      "photo_image_url",
      "photoImageUrl",
      "photo_url",
      "photoUrl",
      "node.photo_image_url",
      "node.photoImageUrl",
      "node.photo_url",
      "node.photoUrl",
      "image_url",
      "imageUrl",
      "image.url",
      "image.uri",
      "image.src",
      "image.original",
      "image.large",
      "node.image_url",
      "node.imageUrl",
      "node.image.url",
      "node.image.uri",
      "node.image.src",
      "node.image.original",
      "node.image.large",
      "image_uri",
      "imageUri",
      "node.image_uri",
      "node.imageUri",
      "src",
      "source",
      "thumbnail",
      "thumbnail_url",
      "thumbnailUrl",
      "node.thumbnail",
      "node.thumbnail_url",
      "node.thumbnailUrl",
      "preview_image_url",
      "previewImageUrl",
      "original_image_url",
      "originalImageUrl",
      "display_image_url",
      "displayImageUrl",
      "uri",
      "url",
      "node.uri",
      "original",
      "large",
    ];

    for (const path of photoObjectCandidatePaths) {
      const nested = getNestedValue(value, path);
      if (typeof nested === "string") {
        pushUrl(nested);
      }
    }
  };

  const imageCollectionPaths = [
    "listingPhotos",
    "listingPhotos.nodes",
    "listingPhotos.edges",
    "listing_photos",
    "listing_photos.nodes",
    "listing_photos.edges",
    "listingPhotos",
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
    "listing_details.gallery",
    "listing_details.media",
    "listing_details.all_photos",
    "listing_details.allPhotos",
    "listingDetails.photos",
    "listingDetails.images",
    "listingDetails.gallery",
    "listingDetails.media",
    "listingDetails.allPhotos",
  ];

  const primaryImagePaths = [
    "primary_listing_photo.photo_image_url",
    "primary_listing_photo.image_url",
    "primary_listing_photo.uri",
    "primaryListingPhoto.photo_image_url",
    "primaryListingPhoto.photoImageUrl",
    "primaryListingPhoto.imageUrl",
    "primaryListingPhoto.image.uri",
    "primaryListingPhoto.uri",
    "primaryPhoto.imageUrl",
    "primaryPhoto.url",
  ];

  imageCollectionPaths.forEach((path) => collectFromUnknown(getNestedValue(item, path)));
  primaryImagePaths.forEach((path) => collectFromUnknown(getNestedValue(item, path)));

  return imageUrls;
};

const parsePriceAmount = (amount: string | undefined): number => {
  if (!amount) {
    return 0;
  }

  const normalized = amount.replace(/[^0-9]/g, "");
  const parsed = Number.parseInt(normalized, 10);
  return Number.isFinite(parsed) ? parsed : 0;
};

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

const resolveCanonicalCity = (value: string): string | undefined => {
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

const parsePositiveInteger = (value: unknown): number | undefined => {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      return undefined;
    }
    const asInteger = Math.trunc(value);
    return asInteger > 0 ? asInteger : undefined;
  }

  if (typeof value === "string") {
    const match = value.match(/\d{1,2}/);
    if (!match) {
      return undefined;
    }
    const parsed = Number.parseInt(match[0], 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  }

  return undefined;
};

const getFirstPositiveInteger = (source: unknown, paths: string[]): number | undefined => {
  for (const path of paths) {
    const value = getNestedValue(source, path);
    const parsed = parsePositiveInteger(value);
    if (parsed !== undefined) {
      return parsed;
    }
  }

  return undefined;
};

const extractRoomsFromDescription = (description: string): number | undefined => {
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

const extractNeighborhoodFromDescription = (description: string): string | undefined => {
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

    const firstSegment = match[1].split(/[,;\n\r\.]/)[0] ?? "";
    const normalized = normalizeLocationSegment(firstSegment);

    if (normalized.length < 2) {
      continue;
    }

    if (resolveCanonicalCity(normalized)) {
      continue;
    }

    return normalized;
  }

  return undefined;
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

const getApifyApiToken = (): string => {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) {
    throw new Error("APIFY_API_TOKEN no está definido en .env");
  }
  return token;
};

export const runFacebookScraper = async (city: string): Promise<ScrapedPropertyInput[]> => {
  const normalizedCity = city.trim();
  const encodedCity = encodeURIComponent(normalizedCity);
  const targetUrl = `https://web.facebook.com/marketplace/112307505452766/search/?query=arriendos%20${encodedCity}`;
  const apifyToken = getApifyApiToken();

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
        resultsLimit: APIFY_RESULTS_LIMIT,
        maxItems: APIFY_RESULTS_LIMIT,
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
      const cityFromMetadata = resolveCanonicalCity(cityMetadataRaw);
      const cityFromSearch = resolveCanonicalCity(normalizedCity);
      const fallbackCity = cityMetadataRaw || normalizedCity;
      const mappedCity = cityFromDescription ?? cityFromMetadata ?? cityFromSearch ?? fallbackCity;
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
      const mappedNeighborhood =
        neighborhoodFromDescription ??
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
      const mappedRooms = roomsFromMetadata ?? extractRoomsFromDescription(description);
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
    .filter((item) => item.title.length > 0 && item.sourceUrl.length > 0);
};
