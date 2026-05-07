import { z } from "zod";

export type PropertySearchSort = "relevance" | "newest" | "priceAsc" | "priceDesc";

export interface ParsedPropertySearchQuery {
  query?: string;
  location?: string;
  minPrice?: number;
  maxPrice?: number;
  rooms?: number;
  page: number;
  pageSize: number;
  sort: PropertySearchSort;
}

const asOptionalString = (value: string | null): string | undefined => {
  if (value === null) {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
};

const toOptionalNumber = (value: unknown): unknown => {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value === "string" && value.trim().length === 0) {
    return undefined;
  }

  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    return Number(value);
  }

  return value;
};

const createSearchQuerySchema = (defaultPageSize: number) => {
  return z
    .object({
      query: z.string().min(1).max(120).optional(),
      location: z.string().min(1).max(120).optional(),
      minPrice: z.preprocess(
        toOptionalNumber,
        z.number().positive().finite().optional(),
      ),
      maxPrice: z.preprocess(
        toOptionalNumber,
        z.number().positive().finite().optional(),
      ),
      rooms: z.preprocess(
        toOptionalNumber,
        z.number().int().min(1).max(20).optional(),
      ),
      page: z.preprocess(toOptionalNumber, z.number().int().min(1).default(1)),
      pageSize: z.preprocess(
        toOptionalNumber,
        z.number().int().min(1).max(50).default(defaultPageSize),
      ),
      sort: z
        .enum(["relevance", "newest", "priceAsc", "priceDesc"])
        .default("relevance"),
    })
    .superRefine((data, context) => {
      if (
        data.minPrice !== undefined &&
        data.maxPrice !== undefined &&
        data.minPrice > data.maxPrice
      ) {
        context.addIssue({
          code: "custom",
          path: ["minPrice"],
          message: "El precio mínimo no puede ser mayor que el precio máximo.",
        });
      }
    });
};

export const parsePropertySearchQuery = (
  params: URLSearchParams,
  options: {
    defaultPageSize: number;
  },
): ParsedPropertySearchQuery => {
  const schema = createSearchQuerySchema(options.defaultPageSize);

  return schema.parse({
    query: asOptionalString(params.get("query")),
    location: asOptionalString(params.get("location")),
    minPrice: params.get("minPrice") ?? undefined,
    maxPrice: params.get("maxPrice") ?? undefined,
    rooms: params.get("rooms") ?? undefined,
    page: params.get("page") ?? undefined,
    pageSize: params.get("pageSize") ?? undefined,
    sort: asOptionalString(params.get("sort")),
  });
};
