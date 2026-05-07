import { z } from "zod";

export type SearchSort = "relevance" | "newest" | "priceAsc" | "priceDesc";
export type ViewerRole = "USER" | "SUPERADMIN";
export type SearchPageSize = 6 | 12 | 24;

export interface FilterState {
  query: string;
  location: string;
  minPrice: string;
  maxPrice: string;
  rooms: string;
  sort: SearchSort;
}

export interface PropertyItem {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  price: number | string;
  location: string;
  rooms: number;
}

export interface SearchMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface FavoriteListItem {
  propertyId: string;
}

export interface SavedSearchFilterItem {
  id: string;
  query: string | null;
  location: string | null;
  minPrice: string | null;
  maxPrice: string | null;
  rooms: number | null;
}

export const PAGE_SIZE: SearchPageSize = 12;
export const pageSizeValues: SearchPageSize[] = [6, 12, 24];
const sortValues: SearchSort[] = ["relevance", "newest", "priceAsc", "priceDesc"];

const propertyItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  imageUrl: z.string(),
  price: z.union([z.number(), z.string()]),
  location: z.string(),
  rooms: z.number().int(),
});

export const searchResponseSchema = z.object({
  data: z.array(propertyItemSchema),
  meta: z.object({
    page: z.number().int(),
    pageSize: z.number().int(),
    total: z.number().int(),
    totalPages: z.number().int(),
  }),
  viewerRole: z.enum(["USER", "SUPERADMIN"]),
});

export const favoritesResponseSchema = z.object({
  data: z.array(z.object({ propertyId: z.string() })),
});

export const savedSearchFilterResponseSchema = z.object({
  data: z.array(
    z.object({
      id: z.string(),
      query: z.string().nullable(),
      location: z.string().nullable(),
      minPrice: z.string().nullable(),
      maxPrice: z.string().nullable(),
      rooms: z.number().int().nullable(),
    }),
  ),
});

export const currencyFormat = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

export const defaultFilters: FilterState = {
  query: "",
  location: "",
  minPrice: "",
  maxPrice: "",
  rooms: "",
  sort: "relevance",
};

const isSearchSort = (value: string | null): value is SearchSort =>
  value !== null && sortValues.includes(value as SearchSort);

const parsePageSize = (value: string | null): SearchPageSize => {
  if (!value) return PAGE_SIZE;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || !pageSizeValues.includes(parsed as SearchPageSize)) {
    return PAGE_SIZE;
  }
  return parsed as SearchPageSize;
};

const parsePositiveInt = (value: string | null): number => {
  if (!value) return 1;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return 1;
  return parsed;
};

export const buildSearchParams = (
  filters: FilterState,
  page: number,
  pageSize: SearchPageSize,
): URLSearchParams => {
  const params = new URLSearchParams();

  const query = filters.query.trim();
  const location = filters.location.trim();
  const minPrice = filters.minPrice.trim();
  const maxPrice = filters.maxPrice.trim();
  const rooms = filters.rooms.trim();

  if (query.length > 0) params.set("query", query);
  if (location.length > 0) params.set("location", location);
  if (minPrice.length > 0) params.set("minPrice", minPrice);
  if (maxPrice.length > 0) params.set("maxPrice", maxPrice);
  if (rooms.length > 0) params.set("rooms", rooms);

  params.set("sort", filters.sort);
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));

  return params;
};

export const buildPdfDownloadHref = (filters: FilterState): string => {
  const params = buildSearchParams(filters, 1, PAGE_SIZE);
  params.set("pageSize", "50");
  return `/api/properties/search/pdf?${params.toString()}`;
};

export const parseStateFromUrl = (
  search: string,
): {
  filters: FilterState;
  page: number;
  pageSize: SearchPageSize;
  hasUserParams: boolean;
} => {
  const params = new URLSearchParams(search);

  const query = params.get("query")?.trim() ?? "";
  const location = params.get("location")?.trim() ?? "";
  const minPrice = params.get("minPrice")?.trim() ?? "";
  const maxPrice = params.get("maxPrice")?.trim() ?? "";
  const rooms = params.get("rooms")?.trim() ?? "";
  const sortParam = params.get("sort");
  const sort: SearchSort = isSearchSort(sortParam) ? sortParam : "relevance";
  const page = parsePositiveInt(params.get("page"));
  const pageSize = parsePageSize(params.get("pageSize"));

  const hasUserParams =
    query.length > 0 ||
    location.length > 0 ||
    minPrice.length > 0 ||
    maxPrice.length > 0 ||
    rooms.length > 0 ||
    isSearchSort(sortParam) ||
    page > 1 ||
    pageSize !== PAGE_SIZE;

  return {
    filters: { query, location, minPrice, maxPrice, rooms, sort },
    page,
    pageSize,
    hasUserParams,
  };
};

export const toNumericPrice = (value: string | number): number =>
  typeof value === "number" ? value : Number(value);

export const toFilterState = (saved: SavedSearchFilterItem): FilterState => ({
  query: saved.query ?? "",
  location: saved.location ?? "",
  minPrice: saved.minPrice ?? "",
  maxPrice: saved.maxPrice ?? "",
  rooms: saved.rooms === null ? "" : String(saved.rooms),
  sort: "relevance",
});

export const toSaveSearchFilterPayload = (filters: FilterState) => {
  const query = filters.query.trim();
  const location = filters.location.trim();
  const minPriceRaw = filters.minPrice.trim();
  const maxPriceRaw = filters.maxPrice.trim();
  const roomsRaw = filters.rooms.trim();
  const minPrice = minPriceRaw.length > 0 ? Number(minPriceRaw) : undefined;
  const maxPrice = maxPriceRaw.length > 0 ? Number(maxPriceRaw) : undefined;
  const rooms = roomsRaw.length > 0 ? Number(roomsRaw) : undefined;

  return {
    query: query.length > 0 ? query : undefined,
    location: location.length > 0 ? location : undefined,
    minPrice: Number.isFinite(minPrice) ? minPrice : undefined,
    maxPrice: Number.isFinite(maxPrice) ? maxPrice : undefined,
    rooms: Number.isFinite(rooms) ? rooms : undefined,
  };
};
