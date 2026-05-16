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

const APIFY_BOOKING_ENDPOINT =
  "https://api.apify.com/v2/acts/voyager~booking-scraper/run-sync-get-dataset-items";
const DEFAULT_RESULTS_LIMIT = 10;
const MAX_RESULTS_LIMIT = 50;
const APIFY_REQUEST_TIMEOUT_MS = 120_000;

// Booking prices are nightly; multiply to estimate monthly equivalent
const NIGHTLY_TO_MONTHLY_MULTIPLIER = 30;

// URL format confirmed working: ss + ssne + ssne_untouched params
const buildBookingSearchUrl = (query: string): string => {
  const city = encodeURIComponent(query.trim().toLowerCase());
  return `https://www.booking.com/searchresults.es.html?ss=${city}&ssne=${city}&ssne_untouched=${city}`;
};

const BOOKING_IMAGE_COLLECTION_PATHS = [
  "photos", "images", "hotel_photos",
  "property_photos", "listing.photos",
];

const BOOKING_IMAGE_SCALAR_PATHS = [
  "url", "src", "large_url", "small_url",
  "photo_url", "thumbnail", "uri",
];

export const runBookingScraper = async (
  query: string,
  count = DEFAULT_RESULTS_LIMIT,
): Promise<ScrapedPropertyInput[]> => {
  const resultsLimit = clampLimit(count, MAX_RESULTS_LIMIT);
  const apifyToken = getApifyApiToken();
  const searchUrl = buildBookingSearchUrl(query);

  console.info(
    `[scraper:booking] Ejecutando Booking para "${query}" → ${searchUrl} (límite ${resultsLimit}).`,
  );

  const response = await fetch(
    `${APIFY_BOOKING_ENDPOINT}?token=${encodeURIComponent(apifyToken)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startUrls: [{ url: searchUrl }],
        maxItems: resultsLimit,
        sortBy: "distance_from_search",
        currency: "USD",
        language: "en-gb",
        minMaxPrice: "0-999999",
        starsCountFilter: "any",
        propertyType: "none",
        extractAdditionalHotelData: false,
        rooms: 1,
        adults: 2,
        children: 0,
      }),
      signal: AbortSignal.timeout(APIFY_REQUEST_TIMEOUT_MS),
    },
  ).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Error de red desconocido";
    throw new Error(`No se pudo conectar con Apify (Booking): ${message}`);
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `Apify (Booking) respondió con error ${response.status}${text ? `: ${text}` : ""}`,
    );
  }

  const data: unknown = await response.json();
  if (!Array.isArray(data)) {
    throw new Error("La respuesta de Apify (Booking) no tiene el formato esperado.");
  }

  return data
    .map((raw) => {
      const item = raw as Record<string, unknown>;

      const title = getFirstNonEmptyString(item, [
        "name", "hotel_name", "hotelName", "title",
      ]);

      const description =
        getFirstNonEmptyText(item, [
          "description", "hotel_description", "hotelDescription",
          "summary", "amenities_summary",
        ]) || title;

      const sourceUrl = getFirstNonEmptyString(item, [
        "url", "hotel_url", "hotelUrl", "link",
      ]);

      const nightlyPrice = getFirstParsablePrice(item, [
        "price", "priceRaw", "price_raw",
        "total_price", "totalPrice",
        "cheapest_price", "cheapestPrice",
      ]);
      const price = nightlyPrice > 0 ? nightlyPrice * NIGHTLY_TO_MONTHLY_MULTIPLIER : 0;

      const cityRaw = getFirstNonEmptyString(item, [
        "city", "address.city", "location.city", "hotel_city",
      ]);

      const neighborhoodRaw = getFirstNonEmptyString(item, [
        "neighborhood", "district", "address.neighborhood",
        "location.neighborhood",
      ]);

      const location = neighborhoodRaw
        ? cityRaw
          ? `${neighborhoodRaw}, ${cityRaw}`
          : neighborhoodRaw
        : cityRaw || query;

      const rooms = getFirstPositiveInteger(item, [
        "rooms", "bedrooms", "max_occupancy",
        "room_type.max_occupancy",
      ]);

      const imageUrls = collectImageUrls(
        item,
        BOOKING_IMAGE_COLLECTION_PATHS,
        BOOKING_IMAGE_SCALAR_PATHS,
      );

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
