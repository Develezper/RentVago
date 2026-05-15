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

const APIFY_ML_ENDPOINT =
  "https://api.apify.com/v2/acts/m_p_s~mercado-libre-scraper/run-sync-get-dataset-items";
const DEFAULT_RESULTS_LIMIT = 10;
const MAX_RESULTS_LIMIT = 50;
const APIFY_REQUEST_TIMEOUT_MS = 90_000;

// MercadoLibre Colombia apartments for rent
const buildSearchUrl = (query: string): string => {
  const encoded = encodeURIComponent(query.trim());
  return `https://listado.mercadolibre.com.co/inmuebles/arriendo/apartamentos/?q=${encoded}`;
};

const ML_IMAGE_COLLECTION_PATHS = [
  "pictures", "photos", "images", "thumbnail",
  "attributes.pictures", "listing.pictures",
];

const ML_IMAGE_SCALAR_PATHS = [
  "url", "secure_url", "size", "max_size",
  "secure_thumbnail", "thumbnail",
];

// MercadoLibre attribute value extractor
const getAttributeValue = (item: Record<string, unknown>, attributeId: string): string | undefined => {
  const attributes = item["attributes"];
  if (!Array.isArray(attributes)) return undefined;

  for (const attr of attributes) {
    if (
      typeof attr === "object" &&
      attr !== null &&
      "id" in attr &&
      attr["id"] === attributeId &&
      "value_name" in attr &&
      typeof attr["value_name"] === "string"
    ) {
      return (attr["value_name"] as string).trim();
    }
  }
  return undefined;
};

export const runMercadoLibreScraper = async (
  query: string,
  count = DEFAULT_RESULTS_LIMIT,
): Promise<ScrapedPropertyInput[]> => {
  const resultsLimit = clampLimit(count, MAX_RESULTS_LIMIT);
  const apifyToken = getApifyApiToken();
  const searchUrl = buildSearchUrl(query);

  console.info(`[scraper:ml] Ejecutando MercadoLibre para "${query}" con límite ${resultsLimit}.`);

  const response = await fetch(
    `${APIFY_ML_ENDPOINT}?token=${encodeURIComponent(apifyToken)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startUrls: [{ url: searchUrl }],
        maxItems: resultsLimit,
        maxResults: resultsLimit,
      }),
      signal: AbortSignal.timeout(APIFY_REQUEST_TIMEOUT_MS),
    },
  ).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Error de red desconocido";
    throw new Error(`No se pudo conectar con Apify (MercadoLibre): ${message}`);
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `Apify (MercadoLibre) respondió con error ${response.status}${text ? `: ${text}` : ""}`,
    );
  }

  const data: unknown = await response.json();
  if (!Array.isArray(data)) {
    throw new Error("La respuesta de Apify (MercadoLibre) no tiene el formato esperado.");
  }

  return data
    .map((raw) => {
      const item = raw as Record<string, unknown>;

      const title = getFirstNonEmptyString(item, ["title", "name"]);

      const description =
        getFirstNonEmptyText(item, ["description.plain_text", "description.text", "description", "body"]) ||
        title;

      const sourceUrl = getFirstNonEmptyString(item, [
        "permalink", "url", "link", "item_url",
      ]);

      const price = getFirstParsablePrice(item, [
        "price", "sale_price", "original_price",
        "selling_price", "listing.price",
      ]);

      const cityRaw = getFirstNonEmptyString(item, [
        "seller_address.city.name",
        "location.city.name",
        "address.city_name",
        "city",
      ]);

      const neighborhoodRaw = getFirstNonEmptyString(item, [
        "seller_address.neighborhood.name",
        "location.neighborhood.name",
        "address.neighborhood",
        "neighborhood",
      ]);

      const stateRaw = getFirstNonEmptyString(item, [
        "seller_address.state.name",
        "location.state.name",
        "state",
      ]);

      const location = neighborhoodRaw
        ? cityRaw
          ? `${neighborhoodRaw}, ${cityRaw}`
          : neighborhoodRaw
        : cityRaw || stateRaw || query;

      const bedroomsAttr = getAttributeValue(item, "BEDROOMS");
      const rooms = bedroomsAttr
        ? (Number.parseInt(bedroomsAttr, 10) || undefined)
        : getFirstPositiveInteger(item, ["bedrooms", "rooms", "attributes.BEDROOMS"]);

      const imageUrls = collectImageUrls(item, ML_IMAGE_COLLECTION_PATHS, ML_IMAGE_SCALAR_PATHS);

      const thumbnailRaw = getFirstNonEmptyString(item, ["thumbnail", "secure_thumbnail"]);
      if (thumbnailRaw && imageUrls.length === 0) imageUrls.push(thumbnailRaw);

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
