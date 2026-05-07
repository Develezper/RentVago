import type { ScrapedPropertyInput } from "@/modules/admin/domain/admin.types";

const APIFY_FACEBOOK_SCRAPER_ENDPOINT =
  "https://api.apify.com/v2/acts/apify~facebook-marketplace-scraper/run-sync-get-dataset-items";

interface ApifyListingPrice {
  amount?: string;
}

interface ApifyReverseGeocode {
  city?: string;
}

interface ApifyLocation {
  reverse_geocode?: ApifyReverseGeocode;
}

interface ApifyPrimaryListingPhoto {
  photo_image_url?: string;
}

interface ApifyFacebookItem {
  marketplace_listing_title?: string;
  custom_title?: string;
  listing_price?: ApifyListingPrice;
  location?: ApifyLocation;
  primary_listing_photo?: ApifyPrimaryListingPhoto;
  listingUrl?: string;
}

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
        includeListingDetails: false,
        resultsLimit: 20,
        startUrls: [{ url: targetUrl }],
      }),
      signal: AbortSignal.timeout(45000),
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
      const title = (item.marketplace_listing_title ?? item.custom_title ?? "").trim();
      const mappedCity = item.location?.reverse_geocode?.city?.trim() || normalizedCity;
      const primaryImageUrl = item.primary_listing_photo?.photo_image_url;

      return {
        title,
        description: title,
        price: parsePriceAmount(item.listing_price?.amount),
        location: mappedCity,
        imageUrls: primaryImageUrl ? [primaryImageUrl] : [],
        sourceUrl: (item.listingUrl ?? "").trim(),
      } satisfies ScrapedPropertyInput;
    })
    .filter((item) => item.title.length > 0 && item.sourceUrl.length > 0);
};
