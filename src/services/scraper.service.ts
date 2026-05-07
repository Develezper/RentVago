import axios from "axios";
import { prisma } from "@/lib/prisma";

interface ApifyFBItem {
  marketplace_listing_title?: string;
  listingUrl?: string;
  facebookUrl?: string;
  description?: string;
  id?: string | number;
  "primary_listing_photo.photo_image_url"?: string;
  "listing_price.formatted_amount"?: string;
  "listing_price.amount"?: string;
}

interface ScrapedProperty {
  title: string;
  description: string;
  price: number;
  location: string | undefined;
  imageUrl: string | undefined;
  sourceUrl: string;
}

function isValid(item: ScrapedProperty): boolean {
  return item.title.length > 0 && item.price > 0 && item.sourceUrl.length > 0;
}

async function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runApifyScraper(
  fbUrl: string,
): Promise<{ saved: number; discarded: number }> {
  const token = process.env.APIFY_TOKEN;
  if (!token) throw new Error("APIFY_TOKEN no está definido en .env");

  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

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

  // Poll hasta 15 intentos × 8s = 2 minutos máximo
  for (let attempt = 1; attempt <= 15; attempt++) {
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

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if ((item as Record<string, unknown>).error) { discarded++; continue; }

    const title = (item.marketplace_listing_title ?? "").trim();
    const priceRaw =
      item["listing_price.amount"] ?? item["listing_price.formatted_amount"] ?? "0";
    const price = parseFloat(priceRaw.replace(/[^\d.]/g, ""));
    const sourceUrl = item.listingUrl ?? `fb-marketplace-${item.id ?? i}`;
    const imageUrl = item["primary_listing_photo.photo_image_url"] ?? undefined;

    const scraped: ScrapedProperty = {
      title,
      description: item.description ?? "",
      price: isNaN(price) ? 0 : price,
      location: undefined,
      imageUrl,
      sourceUrl,
    };

    if (!isValid(scraped)) { discarded++; continue; }

    await prisma.property.upsert({
      where: { sourceUrl: scraped.sourceUrl },
      update: {
        title: scraped.title,
        description: scraped.description,
        price: scraped.price,
        images: scraped.imageUrl ? [scraped.imageUrl] : [],
      },
      create: {
        title: scraped.title,
        description: scraped.description,
        price: scraped.price,
        location: scraped.location ?? "Facebook Marketplace",
        images: scraped.imageUrl ? [scraped.imageUrl] : [],
        sourceUrl: scraped.sourceUrl,
        isScraped: true,
        type: "APARTAMENTO",
      },
    });
    saved++;
  }

  return { saved, discarded };
}

export async function runScraping(
  url: string,
): Promise<{ saved: number; discarded: number }> {
  if (url.includes("facebook.com/marketplace")) {
    return runApifyScraper(url);
  }
  throw new Error("Solo se soportan URLs de Facebook Marketplace por ahora.");
}

export async function runScrapingAllSources(): Promise<
  Array<{ source: string; saved: number; discarded: number; error?: string }>
> {
  const sources = await prisma.scrapingFuente.findMany({ where: { activo: true } });
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
}
