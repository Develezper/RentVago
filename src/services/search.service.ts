import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export interface PropertySearchFilters {
  query?: string;
  location?: string;
  minPrice?: number;
  maxPrice?: number;
  rooms?: number;
  sort?: "relevance" | "newest" | "priceAsc" | "priceDesc";
  page: number;
  pageSize: number;
}

export interface PropertySearchItem {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  price: number | string;
  location: string;
  rooms: number;
}

export interface PropertySearchResult {
  data: PropertySearchItem[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export const searchProperties = async (
  filters: PropertySearchFilters,
): Promise<PropertySearchResult> => {
  const query = filters.query?.trim() ?? "";
  const location = filters.location?.trim() ?? "";
  const hasQuery = query.length > 0;
  const hasLocation = location.length > 0;
  const sort = filters.sort ?? "relevance";
  const skip = (filters.page - 1) * filters.pageSize;
  const conditions: Prisma.Sql[] = [];

  // Use immutable_unaccent (defined in public schema with search_path = public, extensions)
  // so that unaccent() resolves from Supabase's extensions schema.
  const normalizeSql = (value: Prisma.Sql): Prisma.Sql =>
    Prisma.sql`immutable_unaccent(lower(${value}))`;

  const strictTextSearchQuery = hasQuery
    ? Prisma.sql`plainto_tsquery('spanish', ${normalizeSql(Prisma.sql`${query}`)})`
    : null;

  if (strictTextSearchQuery) {
    conditions.push(Prisma.sql`"search_vector" @@ ${strictTextSearchQuery}`);
  }

  if (hasLocation) {
    conditions.push(
      Prisma.sql`${normalizeSql(Prisma.sql`"location"`)} LIKE '%' || ${normalizeSql(Prisma.sql`${location}`)} || '%'`,
    );
  }

  if (filters.rooms !== undefined) {
    conditions.push(Prisma.sql`"rooms" >= ${filters.rooms}`);
  }

  if (filters.minPrice !== undefined) {
    conditions.push(Prisma.sql`"price" >= ${filters.minPrice}`);
  }

  if (filters.maxPrice !== undefined) {
    conditions.push(Prisma.sql`"price" <= ${filters.maxPrice}`);
  }

  const whereClause =
    conditions.length > 0
      ? Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`
      : Prisma.empty;

  const orderByClause = (() => {
    if (sort === "priceAsc") return Prisma.sql`ORDER BY "price" ASC, "createdAt" DESC`;
    if (sort === "priceDesc") return Prisma.sql`ORDER BY "price" DESC, "createdAt" DESC`;
    if (sort === "newest") return Prisma.sql`ORDER BY "createdAt" DESC`;
    if (strictTextSearchQuery) {
      return Prisma.sql`ORDER BY ts_rank("search_vector", ${strictTextSearchQuery}) DESC, "createdAt" DESC`;
    }
    return Prisma.sql`ORDER BY "createdAt" DESC`;
  })();

  const [properties, countResult] = await Promise.all([
    prisma.$queryRaw<PropertySearchItem[]>`
      SELECT
        "id",
        "title",
        "description",
        COALESCE("images"[1], '') AS "imageUrl",
        "price",
        "location",
        COALESCE("rooms", 0) AS "rooms"
      FROM "Property"
      ${whereClause}
      ${orderByClause}
      OFFSET ${skip}
      LIMIT ${filters.pageSize}
    `,
    prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS "count"
      FROM "Property"
      ${whereClause}
    `,
  ]);

  const rawCount = countResult[0]?.count;
  const total = rawCount === undefined ? 0 : Number(rawCount);

  return {
    data: properties,
    meta: {
      page: filters.page,
      pageSize: filters.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / filters.pageSize)),
    },
  };
};

export const searchService = {
  searchProperties,
};
