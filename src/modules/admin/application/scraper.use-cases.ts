import axios from "axios";
import { adminRepository } from "@/modules/admin/infrastructure/admin.repository";

interface ApifyFBItem {
  marketplace_listing_title?: string;
  listingUrl?: string;
  id?: string | number;
  description?: string;
  "primary_listing_photo.photo_image_url"?: string;
  "listing_price.formatted_amount"?: string;
  "listing_price.amount"?: string;
}

interface ScrapedProperty {
  title: string;
  description: string;
  price: number;
  location: string;
  imageUrl: string | undefined;
  sourceUrl: string;
}

const isValid = (item: ScrapedProperty): boolean => {
  return item.title.length > 0 && item.price > 0 && item.sourceUrl.length > 0;
};

const wait = async (ms: number): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, ms));
};

const runApifyScraper = async (fbUrl: string): Promise<{ saved: number; discarded: number }> => {
  const token = process.env.APIFY_TOKEN;
  if (!token) throw new Error("APIFY_TOKEN no está definido en .env");

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const runRes = await axios.post(
    "https://api.apify.com/v2/acts/apify~facebook-marketplace-scraper/runs",
    {
      startUrls: [{ url: fbUrl }],
      urls: [fbUrl],
      maxItems: 10,
      maxPagesPerUrl: 10,
      getListingDetails: false,
      getAllListingPhotos: true,
      strictFiltering: false,
      proxy: { useApifyProxy: true },
    },
    { headers, timeout: 30000, params: { maxTotalChargeUsd: 1.0 } },
  );

  const runId: string = runRes.data?.data?.id;
  const datasetId: string = runRes.data?.data?.defaultDatasetId;

  if (!runId || !datasetId) {
    throw new Error("La respuesta de Apify /runs no trajo id o defaultDatasetId");
  }

  for (let attempt = 1; attempt <= 15; attempt += 1) {
    await wait(8000);

    const statusRes = await axios.get(`https://api.apify.com/v2/actor-runs/${runId}`, {
      headers,
      timeout: 10000,
    });

    const status: string = statusRes.data?.data?.status;

    if (status === "SUCCEEDED") break;

    if (status === "FAILED" || status === "ABORTED" || status === "TIMED-OUT") {
      throw new Error(`El actor de Apify finalizó con estado: ${status}`);
    }

    if (attempt === 15) throw new Error("Timeout: el actor tardó más de 2 minutos");
  }

  const dataRes = await axios.get(
    `https://api.apify.com/v2/datasets/${datasetId}/items?format=json&clean=true&limit=10`,
    { headers, timeout: 30000 },
  );

  const items: ApifyFBItem[] = Array.isArray(dataRes.data) ? dataRes.data : [];
  let saved = 0;
  let discarded = 0;

  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];

    if ((item as Record<string, unknown>).error) {
      discarded += 1;
      continue;
    }

    const title = (item.marketplace_listing_title ?? "").trim();
    const priceRaw =
      item["listing_price.amount"] ?? item["listing_price.formatted_amount"] ?? "0";
    const price = parseFloat(priceRaw.replace(/[^\d.]/g, ""));
    const sourceUrl = item.listingUrl ?? `fb-marketplace-${item.id ?? i}`;
    const imageUrl = item["primary_listing_photo.photo_image_url"] ?? undefined;

    const scraped: ScrapedProperty = {
      title,
      description: item.description ?? "",
      price: Number.isNaN(price) ? 0 : price,
      location: "Facebook Marketplace",
      imageUrl,
      sourceUrl,
    };

    if (!isValid(scraped)) {
      discarded += 1;
      continue;
    }

    await adminRepository.upsertScrapedProperty(scraped);
    saved += 1;
  }

  return { saved, discarded };
};

const runScraping = async (url: string): Promise<{ saved: number; discarded: number }> => {
  if (url.includes("facebook.com/marketplace")) {
    return runApifyScraper(url);
  }

  throw new Error("Solo se soportan URLs de Facebook Marketplace por ahora.");
};

const runScrapingAllSources = async (): Promise<
  Array<{ source: string; saved: number; discarded: number; error?: string }>
> => {
  const sources = await adminRepository.listActiveScrapingSources();
  const results: Array<{ source: string; saved: number; discarded: number; error?: string }> = [];

  for (const source of sources) {
    try {
      const { saved, discarded } = await runScraping(source.url);
      results.push({ source: source.nombre, saved, discarded });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error desconocido";
      results.push({ source: source.nombre, saved: 0, discarded: 0, error: message });
    }
  }

  return results;
};

const listScrapingSources = () => {
  return adminRepository.listScrapingSources();
};

const createScrapingSource = (data: {
  nombre: string;
  url: string;
  activo: boolean;
}) => {
  return adminRepository.createScrapingSource(data);
};

const updateScrapingSource = (
  id: string,
  data: { nombre?: string; url?: string; activo?: boolean },
) => {
  return adminRepository.updateScrapingSource(id, data);
};

const deleteScrapingSource = (id: string) => {
  return adminRepository.deleteScrapingSource(id);
};

export const scraperUseCases = {
  runScraping,
  runScrapingAllSources,
  listScrapingSources,
  createScrapingSource,
  updateScrapingSource,
  deleteScrapingSource,
};
