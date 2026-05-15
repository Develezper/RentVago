import type { ScrapedPropertyInput } from "@/modules/admin/domain/admin.types";
import { ScraperPlatform } from "@/generated/prisma/enums";
import { runFacebookScraper } from "@/modules/admin/infrastructure/apify-facebook.service";
import { runMercadoLibreScraper } from "@/modules/admin/infrastructure/apify-mercadolibre.service";
import { runAirbnbScraper } from "@/modules/admin/infrastructure/apify-airbnb.service";
import { runBookingScraper } from "@/modules/admin/infrastructure/apify-booking.service";

export type ScraperFn = (query: string, count: number) => Promise<ScrapedPropertyInput[]>;

export const SCRAPER_REGISTRY: Record<ScraperPlatform, ScraperFn> = {
  [ScraperPlatform.FACEBOOK]: runFacebookScraper,
  [ScraperPlatform.MERCADOLIBRE]: runMercadoLibreScraper,
  [ScraperPlatform.AIRBNB]: runAirbnbScraper,
  [ScraperPlatform.BOOKING]: runBookingScraper,
};
