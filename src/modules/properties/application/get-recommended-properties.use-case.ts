import type { PropertiesRepository } from "@/modules/properties/domain/property.repository";
import { getCityBySlug, resolveActiveCityByInput } from "@/modules/properties/domain/geography";
import { searchFilterUseCases } from "@/modules/properties/application/search-filter.use-cases";

const DEFAULT_CITY_SLUG = "medellin";
const DEFAULT_LIMIT = 8;

interface GetRecommendedPropertiesInput {
  userId?: string | null;
  preferredCity?: string | null;
  limit?: number;
}

interface RecommendedPropertyItem {
  id: string;
  title: string;
  description: string;
  images: string[];
  price: number;
  location: string;
  rooms: number | null;
  type: string;
  isFeatured: boolean;
  featuredUntil: Date | null;
}

interface GetRecommendedPropertiesResult {
  items: RecommendedPropertyItem[];
  city: string;
  todayNewOffers: number;
  strategy: "personalized" | "city" | "fallback";
}

const toNumberOrUndefined = (value: string | null): number | undefined => {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const getStartOfToday = (): Date => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

const sortFeaturedFirst = (
  items: RecommendedPropertyItem[],
): RecommendedPropertyItem[] => {
  const now = Date.now();

  return [...items].sort((left, right) => {
    const leftActive = left.isFeatured && (!left.featuredUntil || left.featuredUntil.getTime() >= now);
    const rightActive =
      right.isFeatured && (!right.featuredUntil || right.featuredUntil.getTime() >= now);

    if (leftActive !== rightActive) {
      return leftActive ? -1 : 1;
    }

    const leftUntil = left.featuredUntil?.getTime() ?? 0;
    const rightUntil = right.featuredUntil?.getTime() ?? 0;
    return rightUntil - leftUntil;
  });
};

export class GetRecommendedPropertiesUseCase {
  constructor(private readonly repository: PropertiesRepository) {}

  async execute(input: GetRecommendedPropertiesInput): Promise<GetRecommendedPropertiesResult> {
    const limit = input.limit ?? DEFAULT_LIMIT;
    const resolvedPreferredCity =
      input.preferredCity && input.preferredCity.trim().length > 0
        ? resolveActiveCityByInput(input.preferredCity)
        : null;

    const citySlug = resolvedPreferredCity?.slug ?? DEFAULT_CITY_SLUG;
    const cityName = getCityBySlug(citySlug)?.name ?? "Medellin";
    const latestSavedSearch = input.userId
      ? await searchFilterUseCases.getLatestForUser(input.userId)
      : null;

    const minPrice = toNumberOrUndefined(latestSavedSearch?.minPrice ?? null);
    const maxPrice = toNumberOrUndefined(latestSavedSearch?.maxPrice ?? null);

    const hasSavedPriceRange = minPrice !== undefined || maxPrice !== undefined;

    if (resolvedPreferredCity && hasSavedPriceRange) {
      const recommended = await this.repository.listPublicProperties({
        page: 1,
        limit,
        city: citySlug,
        minPrice,
        maxPrice,
      });

      const todayNewOffers = await this.repository.countPublicProperties({
        city: citySlug,
        minPrice,
        maxPrice,
        createdAfter: getStartOfToday(),
      });

      if (recommended.items.length > 0) {
        return {
          items: sortFeaturedFirst(recommended.items),
          city: cityName,
          todayNewOffers,
          strategy: "personalized",
        };
      }
    }

    if (resolvedPreferredCity) {
      const recommended = await this.repository.listPublicProperties({
        page: 1,
        limit,
        city: citySlug,
      });

      const todayNewOffers = await this.repository.countPublicProperties({
        city: citySlug,
        createdAfter: getStartOfToday(),
      });

      if (recommended.items.length > 0) {
        return {
          items: sortFeaturedFirst(recommended.items),
          city: cityName,
          todayNewOffers,
          strategy: "city",
        };
      }
    }

    const fallback = await this.repository.listPublicProperties({
      page: 1,
      limit,
      city: DEFAULT_CITY_SLUG,
    });

    const todayNewOffers = await this.repository.countPublicProperties({
      city: DEFAULT_CITY_SLUG,
      createdAfter: getStartOfToday(),
    });

    return {
      items: sortFeaturedFirst(fallback.items),
      city: getCityBySlug(DEFAULT_CITY_SLUG)?.name ?? "Medellin",
      todayNewOffers,
      strategy: "fallback",
    };
  }
}
