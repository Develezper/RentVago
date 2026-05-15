import type { ScrapedPropertyInput } from "@/modules/admin/domain/admin.types";
import { adminRepository } from "@/modules/admin/infrastructure/admin.repository";
import { runFacebookScraper } from "@/modules/admin/infrastructure/apify-facebook.service";

const isValidScrapedProperty = (item: ScrapedPropertyInput): boolean => {
  return item.title.trim().length > 0 && item.price > 0 && item.sourceUrl.trim().length > 0;
};

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

const previewFacebookScraping = (city: string, limit: number): Promise<ScrapedPropertyInput[]> => {
  return runFacebookScraper(city, limit);
};

const runFacebookScraping = async (
  city: string,
  limit: number,
): Promise<{ fetched: number; saved: number; discarded: number; properties: ScrapedPropertyInput[] }> => {
  const properties = await previewFacebookScraping(city, limit);
  const { saved, discarded } = await saveScrapedProperties(properties);

  return {
    fetched: properties.length,
    saved,
    discarded,
    properties,
  };
};

const runScraping = async (city: string): Promise<{ saved: number; discarded: number }> => {
  const { saved, discarded } = await runFacebookScraping(city, 10);
  return { saved, discarded };
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
  previewFacebookScraping,
  runFacebookScraping,
  saveScrapedProperties,
  runScrapingAllSources,
  listScrapingSources,
  createScrapingSource,
  updateScrapingSource,
  deleteScrapingSource,
};
