import type { ScrapedPropertyInput } from "@/modules/admin/domain/admin.types";
import {
  clampLimit,
  collectImageUrls,
  getApifyApiToken,
  getFirstNonEmptyString,
  getFirstNonEmptyText,
  getFirstParsablePrice,
  getFirstPositiveInteger,
} from "@/modules/admin/infrastructure/apify-shared";

const APIFY_AIRBNB_ENDPOINT =
  "https://api.apify.com/v2/acts/tri_angle~airbnb-scraper/run-sync-get-dataset-items";
const DEFAULT_RESULTS_LIMIT = 10;
const MAX_RESULTS_LIMIT = 50;
const APIFY_REQUEST_TIMEOUT_MS = 90_000;

const NIGHTLY_TO_MONTHLY_MULTIPLIER = 30;

const AIRBNB_IMAGE_COLLECTION_PATHS = [
  "photos", "images", "pictureUrls", "picture_urls",
  "xl_picture_urls", "xlPictureUrls",
  "listing_photos", "listingPhotos",
];

const AIRBNB_IMAGE_SCALAR_PATHS = [
  "picture", "url", "src", "large", "medium",
  "thumbnailUrl", "thumbnail_url",
];

// tri_angle~airbnb-scraper ignores locationQuery for Colombia; startUrls is reliable.
const buildAirbnbStartUrl = (query: string): string => {
  const slug = query
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Mn}/gu, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
  return `https://www.airbnb.com.co/${slug}-colombia/stays`;
};

export const runAirbnbScraper = async (
  query: string,
  count = DEFAULT_RESULTS_LIMIT,
): Promise<ScrapedPropertyInput[]> => {
  const resultsLimit = clampLimit(count, MAX_RESULTS_LIMIT);
  const apifyToken = getApifyApiToken();
  const startUrl = buildAirbnbStartUrl(query);

  console.info(
    `[scraper:airbnb] Ejecutando Airbnb para "${query}" → ${startUrl} (límite ${resultsLimit}).`,
  );

  const response = await fetch(
    `${APIFY_AIRBNB_ENDPOINT}?token=${encodeURIComponent(apifyToken)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startUrls: [{ url: startUrl }],
        maxListings: resultsLimit,
        currency: "COP",
        locale: "en-US",
      }),
      signal: AbortSignal.timeout(APIFY_REQUEST_TIMEOUT_MS),
    },
  ).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Error de red desconocido";
    throw new Error(`No se pudo conectar con Apify (Airbnb): ${message}`);
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `Apify (Airbnb) respondió con error ${response.status}${text ? `: ${text}` : ""}`,
    );
  }

  const data: unknown = await response.json();
  if (!Array.isArray(data)) {
    throw new Error("La respuesta de Apify (Airbnb) no tiene el formato esperado.");
  }

  return data
    .map((raw) => {
      const item = raw as Record<string, unknown>;

      const title = getFirstNonEmptyString(item, [
        "name", "title", "listing.name", "listing.title",
      ]);

      const description =
        getFirstNonEmptyText(item, [
          "publicDescription.summary",
          "public_description.summary",
          "description",
          "listing.description",
          "htmlDescription.htmlText",
        ]) || title;

      const sourceUrl = getFirstNonEmptyString(item, [
        "url", "shareUrl", "share_url", "listing_url", "listingUrl",
      ]);

      const nightlyAmount = getFirstParsablePrice(item, [
        "price.amount", "price.rate", "price.total",
        "pricing_quote.rate.amount",
        "price", "rate", "nightly_price", "nightlyPrice",
      ]);
      const price = nightlyAmount > 0 ? nightlyAmount * NIGHTLY_TO_MONTHLY_MULTIPLIER : 0;

      const cityRaw = getFirstNonEmptyString(item, [
        "location.city", "city",
        "listing.city", "primaryHost.city",
      ]);

      const neighborhoodRaw = getFirstNonEmptyString(item, [
        "location.neighborhood", "neighborhood",
        "listing.neighborhood",
      ]);

      const location = neighborhoodRaw
        ? cityRaw
          ? `${neighborhoodRaw}, ${cityRaw}`
          : neighborhoodRaw
        : cityRaw || query;

      const rooms = getFirstPositiveInteger(item, [
        "bedrooms", "beds", "listing.bedrooms",
        "listing.beds", "roomType",
      ]);

      const imageUrls = collectImageUrls(item, AIRBNB_IMAGE_COLLECTION_PATHS, AIRBNB_IMAGE_SCALAR_PATHS);

      return {
        title,
        description,
        price,
        location,
        city: cityRaw || undefined,
        neighborhood: neighborhoodRaw || undefined,
        rooms,
        imageUrls,
        sourceUrl,
      } satisfies ScrapedPropertyInput;
    })
    .filter((item) => item.title.length > 0 && item.sourceUrl.length > 0)
    .slice(0, resultsLimit);
};
