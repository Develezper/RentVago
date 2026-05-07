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
      "image_url",
      "imageUrl",
      "image.url",
      "image.uri",
      "image.src",
      "image.original",
      "image.large",
      "image_uri",
      "imageUri",
      "src",
      "source",
      "thumbnail",
      "thumbnail_url",
      "thumbnailUrl",
      "preview_image_url",
      "previewImageUrl",
      "original_image_url",
      "originalImageUrl",
      "display_image_url",
      "displayImageUrl",
      "uri",
      "url",
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
        resultsLimit: APIFY_RESULTS_LIMIT,
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
      const mappedCity =
        getFirstNonEmptyString(item, [
          "location.reverse_geocode.city",
          "location.reverseGeocode.city",
          "location.city",
          "reverse_geocode.city",
          "city",
        ]) || normalizedCity;
      const description =
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
        location: mappedCity,
        imageUrls,
        sourceUrl,
      } satisfies ScrapedPropertyInput;
    })
    .filter((item) => item.title.length > 0 && item.sourceUrl.length > 0);
};
