import { PropertyStatus } from "@/generated/prisma/enums";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getCityBySlug, resolveActiveCityByInput } from "@/modules/properties/domain/geography";
import type { PropertiesRepository } from "@/modules/properties/domain/property.repository";
import type {
  AdminPropertyCreateInput,
  AdminPropertyUpdateInput,
  CreatePropertyDTO,
  PublicPropertyCountQuery,
  PropertySearchFilters,
  PropertySearchResult,
  PublicPropertyListQuery,
} from "@/modules/properties/domain/property.types";

const normalizeSql = (value: Prisma.Sql): Prisma.Sql =>
  Prisma.sql`immutable_unaccent(lower(${value}))`;

const toSerializablePrice = (value: unknown): number => {
  if (typeof value === "number") return value;

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "toString" in value &&
    typeof value.toString === "function"
  ) {
    const parsed = Number(value.toString());
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
};

const buildPublicPropertyWhere = (
  query: Pick<PublicPropertyListQuery, "query" | "city" | "minPrice" | "maxPrice"> & {
    createdAfter?: Date;
  },
): Prisma.PropertyWhereInput => {
  const filters: Prisma.PropertyWhereInput[] = [];

  if (query.query && query.query.trim().length > 0) {
    const normalized = query.query.trim();
    filters.push({
      OR: [
        { title: { contains: normalized, mode: "insensitive" } },
        { location: { contains: normalized, mode: "insensitive" } },
        { description: { contains: normalized, mode: "insensitive" } },
      ],
    });
  }

  if (query.city && query.city.trim().length > 0) {
    const resolvedCity = resolveActiveCityByInput(query.city.trim());

    if (!resolvedCity) {
      filters.push({ id: { equals: "__no-results__" } });
    } else {
      const cityFilters: Prisma.PropertyWhereInput[] = resolvedCity.aliases.flatMap((alias) => [
        { city: { equals: alias, mode: "insensitive" } },
        { location: { contains: alias, mode: "insensitive" } },
      ]);

      filters.push({ OR: cityFilters });
    }
  }

  if (query.minPrice !== undefined && Number.isFinite(query.minPrice)) {
    filters.push({ price: { gte: query.minPrice } });
  }

  if (query.maxPrice !== undefined && Number.isFinite(query.maxPrice)) {
    filters.push({ price: { lte: query.maxPrice } });
  }

  if (query.createdAfter) {
    filters.push({ createdAt: { gte: query.createdAfter } });
  }

  return {
    status: PropertyStatus.AVAILABLE,
    ...(filters.length > 0 ? { AND: filters } : {}),
  };
};

const clearExpiredFeaturedProperties = async (): Promise<void> => {
  await prisma.property.updateMany({
    where: {
      isFeatured: true,
      featuredUntil: { lt: new Date() },
    },
    data: {
      isFeatured: false,
      featuredUntil: null,
    },
  });
};

class PrismaPropertiesRepository implements PropertiesRepository {
  async searchProperties(filters: PropertySearchFilters): Promise<PropertySearchResult> {
    await clearExpiredFeaturedProperties();

    const query = filters.query?.trim() ?? "";
    const location = filters.location?.trim() ?? "";
    const city = filters.city?.trim() ?? "";
    const hasQuery = query.length > 0;
    const hasLocation = location.length > 0;
    const hasCity = city.length > 0;
    const sort = filters.sort ?? "relevance";
    const skip = (filters.page - 1) * filters.pageSize;
    const conditions: Prisma.Sql[] = [Prisma.sql`"status" = ${PropertyStatus.AVAILABLE}`];

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

    if (hasCity) {
      const resolvedCity = resolveActiveCityByInput(city);

      if (!resolvedCity) {
        conditions.push(Prisma.sql`1 = 0`);
      } else {
        const cityConditions = resolvedCity.aliases.map(
          (alias) =>
            Prisma.sql`${normalizeSql(Prisma.sql`COALESCE("city", '')`)} = ${normalizeSql(Prisma.sql`${alias}`)}`,
        );

        const locationConditions = resolvedCity.aliases.map(
          (alias) =>
            Prisma.sql`${normalizeSql(Prisma.sql`"location"`)} LIKE '%' || ${normalizeSql(Prisma.sql`${alias}`)} || '%'`,
        );

        conditions.push(
          Prisma.sql`(${Prisma.join([...cityConditions, ...locationConditions], " OR ")})`,
        );
      }
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

    if (filters.verifiedOnly) {
      conditions.push(Prisma.sql`"isScraped" = false`);
    }

    const whereClause = Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`;

    const orderByClause = (() => {
      const featuredRankSql = Prisma.sql`CASE WHEN "isFeatured" = true AND ("featuredUntil" IS NULL OR "featuredUntil" >= NOW()) THEN 1 ELSE 0 END`;

      if (sort === "priceAsc") {
        return Prisma.sql`ORDER BY ${featuredRankSql} DESC, "price" ASC, "createdAt" DESC`;
      }

      if (sort === "priceDesc") {
        return Prisma.sql`ORDER BY ${featuredRankSql} DESC, "price" DESC, "createdAt" DESC`;
      }

      if (sort === "newest") {
        return Prisma.sql`ORDER BY ${featuredRankSql} DESC, "createdAt" DESC`;
      }

      if (strictTextSearchQuery) {
        return Prisma.sql`ORDER BY ${featuredRankSql} DESC, ts_rank("search_vector", ${strictTextSearchQuery}) DESC, "createdAt" DESC`;
      }

      return Prisma.sql`ORDER BY ${featuredRankSql} DESC, "createdAt" DESC`;
    })();

    const [properties, countResult] = await Promise.all([
      prisma.$queryRaw<Array<{
        id: string;
        title: string;
        description: string;
        imageUrl: string;
        images: string[];
        price: unknown;
        location: string;
        rooms: number;
        isFeatured: boolean;
        featuredUntil: Date | null;
      }>>`
        SELECT
          "id",
          "title",
          "description",
          COALESCE("images"[1], '') AS "imageUrl",
          COALESCE("images", ARRAY[]::text[]) AS "images",
          "price",
          "location",
          COALESCE("rooms", 0) AS "rooms",
          "isFeatured",
          "featuredUntil"
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
    const serializedProperties = properties.map((property) => ({
      ...property,
      price: toSerializablePrice(property.price),
    }));

    return {
      data: serializedProperties,
      meta: {
        page: filters.page,
        pageSize: filters.pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / filters.pageSize)),
      },
    };
  }

  async listPublicProperties(query: PublicPropertyListQuery): Promise<{
    total: number;
    items: Array<{
      id: string;
      title: string;
      description: string;
      images: string[];
      price: { toString(): string };
      location: string;
      rooms: number | null;
      type: string;
      isFeatured: boolean;
      featuredUntil: Date | null;
    }>;
  }> {
    await clearExpiredFeaturedProperties();

    const where = buildPublicPropertyWhere(query);

    const [total, items] = await Promise.all([
      prisma.property.count({ where }),
      prisma.property.findMany({
        where,
        orderBy: [
          { isFeatured: "desc" },
          { featuredUntil: "desc" },
          { createdAt: "desc" },
        ],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        select: {
          id: true,
          title: true,
          description: true,
          images: true,
          price: true,
          location: true,
          rooms: true,
          type: true,
          isFeatured: true,
          featuredUntil: true,
        },
      }),
    ]);

    const serializedItems = items.map((item) => ({
      ...item,
      price: toSerializablePrice(item.price),
    }));

    return { total, items: serializedItems };
  }

  async countPublicProperties(query: PublicPropertyCountQuery): Promise<number> {
    const where = buildPublicPropertyWhere(query);
    return prisma.property.count({ where });
  }

  async getPublicPropertyById(id: string) {
    return prisma.property.findUnique({
      where: { id, status: PropertyStatus.AVAILABLE },
      select: {
        id: true,
        title: true,
        description: true,
        images: true,
        price: true,
        location: true,
        rooms: true,
        type: true,
        isScraped: true,
        isFeatured: true,
        featuredUntil: true,
        sourceUrl: true,
        createdAt: true,
        owner: { select: { id: true, name: true, phone: true } },
      },
    });
  }

  async getPropertyById(id: string) {
    return prisma.property.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        description: true,
        images: true,
        price: true,
        location: true,
        city: true,
        rooms: true,
        type: true,
        isScraped: true,
        isFeatured: true,
        featuredUntil: true,
        sourceUrl: true,
        status: true,
        createdAt: true,
        ownerId: true,
        owner: { select: { id: true, name: true, phone: true } },
      },
    });
  }

  async listOwnerProperties(ownerId: string) {
    return prisma.property.findMany({
      where: { ownerId },
      orderBy: [{ isFeatured: "desc" }, { featuredUntil: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        title: true,
        description: true,
        location: true,
        price: true,
        type: true,
        rooms: true,
        images: true,
        isScraped: true,
        isFeatured: true,
        featuredUntil: true,
        status: true,
        ownerId: true,
        createdAt: true,
      },
    });
  }

  async listAdminProperties() {
    return prisma.property.findMany({
      include: { owner: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async createAdminProperty(input: AdminPropertyCreateInput) {
    return prisma.property.create({
      data: {
        title: input.title,
        description: input.description,
        location: input.location,
        price: input.price,
        rooms: input.rooms,
        type: input.type,
        images: input.images,
        ownerId: input.ownerId ?? null,
      },
    });
  }

  async createDirectProperty(data: CreatePropertyDTO, ownerId: string): Promise<{ id: string }> {
    const cityName = getCityBySlug(data.location.city)?.name ?? data.location.city;
    const composedLocation = [data.location.address, data.location.zone, cityName]
      .map((part) => (typeof part === "string" ? part.trim() : ""))
      .filter((part) => part.length > 0)
      .join(", ");

    const created = await prisma.property.create({
      data: {
        title: data.title,
        description: data.description ?? "",
        location: composedLocation,
        city: cityName,
        neighborhood: data.location.zone,
        price: data.price,
        rooms: data.rooms,
        type: data.type,
        images: data.images ?? [],
        ownerId,
        isScraped: false,
        status: PropertyStatus.PENDING_REVIEW,
      },
      select: {
        id: true,
      },
    });

    return { id: created.id };
  }

  async updateAdminProperty(id: string, input: AdminPropertyUpdateInput) {
    return prisma.property.update({
      where: { id },
      data: {
        title: input.title,
        description: input.description,
        location: input.location,
        rooms: input.rooms,
        type: input.type,
        images: input.images,
        ownerId: input.ownerId,
        price: input.price !== undefined ? input.price : undefined,
      },
    });
  }

  async markPropertyAsFeatured(id: string, featuredUntil: Date) {
    return prisma.property.update({
      where: { id },
      data: {
        isFeatured: true,
        featuredUntil,
      },
      select: {
        id: true,
        ownerId: true,
        isFeatured: true,
        featuredUntil: true,
        updatedAt: true,
      },
    });
  }

  async updatePropertyStatus(id: string, status: PropertyStatus) {
    return prisma.property.update({
      where: { id },
      data: { status },
      select: { id: true, status: true },
    });
  }

  async deleteAdminProperty(id: string): Promise<void> {
    await prisma.property.delete({ where: { id } });
  }

  async listPropertyOptions() {
    return prisma.property.findMany({
      where: { status: PropertyStatus.AVAILABLE },
      orderBy: { title: "asc" },
      select: { id: true, title: true, location: true },
    });
  }
}

export const propertiesRepository: PropertiesRepository = new PrismaPropertiesRepository();
