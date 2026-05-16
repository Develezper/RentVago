import type { ScrapedPropertyInput } from "@/modules/admin/domain/admin.types";
import { ScraperPlatform } from "@/generated/prisma/enums";
import { adminRepository } from "@/modules/admin/infrastructure/admin.repository";
import { runFacebookScraper } from "@/modules/admin/infrastructure/apify-facebook.service";
import { SCRAPER_REGISTRY } from "@/modules/admin/infrastructure/scraper.registry";

const SCRAPING_BATCH_LIMIT = 10;

const isValidScrapedProperty = (item: ScrapedPropertyInput): boolean =>
  item.title.trim().length > 0 && item.price > 0 && item.sourceUrl.trim().length > 0;

const saveScrapedProperties = async (
  scrapedProperties: ScrapedPropertyInput[],
): Promise<{ saved: number; discarded: number }> => {
  let saved = 0;
  let discarded = 0;

  for (const property of scrapedProperties) {
    if (!isValidScrapedProperty(property)) {
      discarded += 1;
      continue;
    }
    await adminRepository.upsertScrapedProperty(property);
    saved += 1;
  }

  return { saved, discarded };
};

const previewFacebookScraping = (city: string, limit: number): Promise<ScrapedPropertyInput[]> =>
  runFacebookScraper(city, limit);

const previewScrapingForPlatform = (
  platform: ScraperPlatform,
  query: string,
  limit: number,
): Promise<ScrapedPropertyInput[]> => SCRAPER_REGISTRY[platform](query, limit);

const runFacebookScraping = async (
  city: string,
  limit: number,
): Promise<{ fetched: number; saved: number; discarded: number; properties: ScrapedPropertyInput[] }> => {
  const properties = await previewFacebookScraping(city, limit);
  const { saved, discarded } = await saveScrapedProperties(properties);
  return { fetched: properties.length, saved, discarded, properties };
};

const runScrapingAllSources = async (): Promise<
  Array<{ source: string; platform: string; saved: number; discarded: number; error?: string }>
> => {
  const sources = await adminRepository.listActiveScrapingSources();

  const tasks = sources.map(async (source) => {
    try {
      const scraper = SCRAPER_REGISTRY[source.plataforma];
      const properties = await scraper(source.url, SCRAPING_BATCH_LIMIT);
      const { saved, discarded } = await saveScrapedProperties(properties);
      return { source: source.nombre, platform: source.plataforma, saved, discarded };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error desconocido";
      return { source: source.nombre, platform: source.plataforma, saved: 0, discarded: 0, error: message };
    }
  });

  return Promise.all(tasks);
};

const listScrapingSources = () => adminRepository.listScrapingSources();

const createScrapingSource = (data: {
  nombre: string;
  url: string;
  activo: boolean;
  plataforma?: ScraperPlatform;
}) => adminRepository.createScrapingSource(data);

const updateScrapingSource = (
  id: string,
  data: { nombre?: string; url?: string; activo?: boolean; plataforma?: ScraperPlatform },
) => adminRepository.updateScrapingSource(id, data);

const deleteScrapingSource = (id: string) => adminRepository.deleteScrapingSource(id);

export const scraperUseCases = {
  previewFacebookScraping,
  previewScrapingForPlatform,
  runFacebookScraping,
  saveScrapedProperties,
  runScrapingAllSources,
  listScrapingSources,
  createScrapingSource,
  updateScrapingSource,
  deleteScrapingSource,
};
