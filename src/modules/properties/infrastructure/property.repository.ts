import { PropertyStatus } from "@/generated/prisma/enums";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { resolveActiveCityByInput } from "@/modules/properties/domain/geography";
import type { PropertiesRepository } from "@/modules/properties/domain/property.repository";
import type {
  AdminPropertyCreateInput,
  AdminPropertyUpdateInput,
  CreatePropertyDTO,
  PropertySearchFilters,
  PropertySearchResult,
  PublicPropertyListQuery,
} from "@/modules/properties/domain/property.types";

const normalizeSql = (value: Prisma.Sql): Prisma.Sql =>
  Prisma.sql`immutable_unaccent(lower(${value}))`;

class PrismaPropertiesRepository implements PropertiesRepository {
  async searchProperties(filters: PropertySearchFilters): Promise<PropertySearchResult> {
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
      if (sort === "priceAsc") return Prisma.sql`ORDER BY "price" ASC, "createdAt" DESC`;
      if (sort === "priceDesc") return Prisma.sql`ORDER BY "price" DESC, "createdAt" DESC`;
      if (sort === "newest") return Prisma.sql`ORDER BY "createdAt" DESC`;
      if (strictTextSearchQuery) {
        return Prisma.sql`ORDER BY ts_rank("search_vector", ${strictTextSearchQuery}) DESC, "createdAt" DESC`;
      }
      return Prisma.sql`ORDER BY "createdAt" DESC`;
    })();

    const [properties, countResult] = await Promise.all([
      prisma.$queryRaw<Array<{
        id: string;
        title: string;
        description: string;
        imageUrl: string;
        images: string[];
        price: number | string;
        location: string;
        rooms: number;
      }>>`
        SELECT
          "id",
          "title",
          "description",
          COALESCE("images"[1], '') AS "imageUrl",
          COALESCE("images", ARRAY[]::text[]) AS "images",
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
    }>;
  }> {
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

    const where: Prisma.PropertyWhereInput = {
      status: PropertyStatus.AVAILABLE,
      ...(filters.length > 0 ? { AND: filters } : {}),
    };

    const [total, items] = await Promise.all([
      prisma.property.count({ where }),
      prisma.property.findMany({
        where,
        orderBy: { createdAt: "desc" },
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
        },
      }),
    ]);

    return { total, items };
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
        createdAt: true,
        owner: { select: { id: true, name: true } },
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
        status: true,
        createdAt: true,
        ownerId: true,
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
    const composedLocation = [data.location.address, data.location.zone, data.location.city]
      .map((part) => (typeof part === "string" ? part.trim() : ""))
      .filter((part) => part.length > 0)
      .join(", ");

    const created = await prisma.property.create({
      data: {
        title: data.title,
        description: data.description ?? "",
        location: composedLocation,
        city: data.location.city,
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
        ...input,
        price: input.price !== undefined ? input.price : undefined,
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
