import type { PropertyType } from "@/generated/prisma/enums";
import type { SearchFilterRepository } from "@/modules/properties/domain/search-filter.repository";

interface PropertyAlertInput {
  id: string;
  title: string;
  location: string;
  city: string | null;
  type: string;
  price: number | string | { toString(): string };
}

const normalizeText = (value: string): string => {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
};

const resolveRequestedPropertyType = (query: string | null): PropertyType | null => {
  if (!query) return null;

  const normalizedQuery = normalizeText(query);
  const asksForApartment =
    normalizedQuery.includes("apartamento") ||
    normalizedQuery.includes("apto") ||
    normalizedQuery.includes("apartaestudio");
  const asksForHouse = normalizedQuery.includes("casa");

  if (asksForApartment && !asksForHouse) return "APARTAMENTO";
  if (asksForHouse && !asksForApartment) return "CASA";

  return null;
};

const matchesCity = (
  filterLocation: string | null,
  propertyCity: string | null,
  propertyLocation: string,
): boolean => {
  if (!filterLocation) return true;

  const normalizedFilterLocation = normalizeText(filterLocation);
  const normalizedCity = propertyCity ? normalizeText(propertyCity) : "";
  const normalizedLocation = normalizeText(propertyLocation);
  const hasCity = normalizedCity.length > 0;

  return (
    (hasCity &&
      (normalizedCity.includes(normalizedFilterLocation) ||
        normalizedFilterLocation.includes(normalizedCity))) ||
    normalizedLocation.includes(normalizedFilterLocation)
  );
};

const matchesPriceRange = (
  minPrice: number | null,
  maxPrice: number | null,
  propertyPrice: number,
): boolean => {
  if (minPrice !== null && propertyPrice < minPrice) return false;
  if (maxPrice !== null && propertyPrice > maxPrice) return false;
  return true;
};

const toNumericPrice = (price: PropertyAlertInput["price"]): number => {
  if (typeof price === "number") return price;
  if (typeof price === "string") return Number(price);
  return Number(price.toString());
};

export class NotifyMatchingUsersUseCase {
  constructor(private readonly searchFilterRepository: SearchFilterRepository) {}

  async execute(property: PropertyAlertInput): Promise<number> {
    const propertyPrice = toNumericPrice(property.price);
    if (!Number.isFinite(propertyPrice)) return 0;

    const propertyType = property.type as PropertyType;
    const candidates = await this.searchFilterRepository.listAlertCandidates();

    const matchingCandidates = candidates.filter((candidate) => {
      const requestedPropertyType = resolveRequestedPropertyType(candidate.query);
      const typeMatches = requestedPropertyType === null || requestedPropertyType === propertyType;
      const cityMatches = matchesCity(candidate.location, property.city, property.location);
      const priceMatches = matchesPriceRange(candidate.minPrice, candidate.maxPrice, propertyPrice);

      return typeMatches && cityMatches && priceMatches;
    });

    for (const match of matchingCandidates) {
      const requestedPropertyType = resolveRequestedPropertyType(match.query);
      const priceRangeLabel =
        match.minPrice === null && match.maxPrice === null
          ? "cualquier precio"
          : `${match.minPrice ?? "0"} - ${match.maxPrice ?? "sin tope"}`;

      console.log(
        `Enviando alerta a ${match.userEmail} por match en ${property.title} (${property.id}). ciudad=${match.location ?? "cualquiera"}, tipo=${requestedPropertyType ?? "cualquiera"}, rango=${priceRangeLabel}, filtro=${match.filterId}`,
      );
    }

    return matchingCandidates.length;
  }
}
