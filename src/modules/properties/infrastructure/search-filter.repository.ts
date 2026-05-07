import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { SearchFilterRepository } from "@/modules/properties/domain/search-filter.repository";
import type {
  MatchNotificationInput,
  SearchAlertCandidate,
  SaveSearchFilterInput,
  UserSearchFilter,
} from "@/modules/properties/domain/search-filter.types";

const searchFilterSelect = {
  id: true,
  query: true,
  minPrice: true,
  maxPrice: true,
  location: true,
  rooms: true,
  createdAt: true,
  updatedAt: true,
} as const;

const alertCandidateSelect = {
  id: true,
  query: true,
  minPrice: true,
  maxPrice: true,
  location: true,
  createdAt: true,
  userId: true,
  user: {
    select: {
      email: true,
      isActive: true,
    },
  },
} as const;

type SearchFilterSelected = Prisma.SearchFilterGetPayload<{
  select: typeof searchFilterSelect;
}>;

type SearchFilterAlertCandidateSelected = Prisma.SearchFilterGetPayload<{
  select: typeof alertCandidateSelect;
}>;

const normalizeNullableString = (value: string | undefined): string | null => {
  if (value === undefined) return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const toPersistenceData = (input: SaveSearchFilterInput) => ({
  query: normalizeNullableString(input.query),
  minPrice: input.minPrice ?? null,
  maxPrice: input.maxPrice ?? null,
  location: normalizeNullableString(input.location),
  rooms: input.rooms ?? null,
});

const mapSearchFilter = (filter: SearchFilterSelected): UserSearchFilter => ({
  id: filter.id,
  query: filter.query,
  minPrice: filter.minPrice === null ? null : filter.minPrice.toString(),
  maxPrice: filter.maxPrice === null ? null : filter.maxPrice.toString(),
  location: filter.location,
  rooms: filter.rooms,
  createdAt: filter.createdAt,
  updatedAt: filter.updatedAt,
});

const mapSearchAlertCandidate = (
  candidate: SearchFilterAlertCandidateSelected,
): SearchAlertCandidate => ({
  filterId: candidate.id,
  userId: candidate.userId,
  userEmail: candidate.user.email,
  query: candidate.query,
  location: candidate.location,
  minPrice: candidate.minPrice === null ? null : Number(candidate.minPrice),
  maxPrice: candidate.maxPrice === null ? null : Number(candidate.maxPrice),
  createdAt: candidate.createdAt,
});

class PrismaSearchFilterRepository implements SearchFilterRepository {
  async getLatestForUser(userId: string): Promise<UserSearchFilter | null> {
    const latest = await prisma.searchFilter.findFirst({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      select: searchFilterSelect,
    });

    return latest ? mapSearchFilter(latest) : null;
  }

  async listForUser(userId: string): Promise<UserSearchFilter[]> {
    const filters = await prisma.searchFilter.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      select: searchFilterSelect,
    });

    return filters.map(mapSearchFilter);
  }

  async getByIdForUser(userId: string, id: string): Promise<UserSearchFilter | null> {
    const filter = await prisma.searchFilter.findFirst({
      where: { id, userId },
      select: searchFilterSelect,
    });

    return filter ? mapSearchFilter(filter) : null;
  }

  async createForUser(userId: string, input: SaveSearchFilterInput): Promise<UserSearchFilter> {
    const created = await prisma.searchFilter.create({
      data: { userId, ...toPersistenceData(input) },
      select: searchFilterSelect,
    });

    return mapSearchFilter(created);
  }

  async updateByIdForUser(
    userId: string,
    id: string,
    input: SaveSearchFilterInput,
  ): Promise<UserSearchFilter | null> {
    const exists = await prisma.searchFilter.findFirst({
      where: { id, userId },
      select: { id: true },
    });

    if (!exists) return null;

    const updated = await prisma.searchFilter.update({
      where: { id },
      data: toPersistenceData(input),
      select: searchFilterSelect,
    });

    return mapSearchFilter(updated);
  }

  async deleteByIdForUser(userId: string, id: string): Promise<boolean> {
    const deleted = await prisma.searchFilter.deleteMany({ where: { id, userId } });
    return deleted.count === 1;
  }

  async saveLatestForUser(
    userId: string,
    input: SaveSearchFilterInput,
  ): Promise<UserSearchFilter> {
    const data = toPersistenceData(input);
    const latest = await prisma.searchFilter.findFirst({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      select: { id: true },
    });

    const saved = latest
      ? await prisma.searchFilter.update({
          where: { id: latest.id },
          data,
          select: searchFilterSelect,
        })
      : await prisma.searchFilter.create({
          data: { userId, ...data },
          select: searchFilterSelect,
        });

    return mapSearchFilter(saved);
  }

  async listAlertCandidates(): Promise<SearchAlertCandidate[]> {
    const filters = await prisma.searchFilter.findMany({
      where: {
        user: {
          isActive: true,
        },
      },
      orderBy: { createdAt: "desc" },
      select: alertCandidateSelect,
    });

    return filters
      .filter((candidate) => candidate.user.isActive)
      .map(mapSearchAlertCandidate);
  }

  async createMatchNotifications(input: MatchNotificationInput[]): Promise<number> {
    if (input.length === 0) return 0;

    const result = await prisma.notification.createMany({
      data: input.map((entry) => ({
        userId: entry.userId,
        message:
          `MATCH:${entry.propertyId}:${entry.filterId}: ` +
          `Nueva propiedad \"${entry.propertyTitle}\" en ${entry.propertyLocation} coincide con tu alerta.`,
      })),
    });

    return result.count;
  }
}

export const searchFilterRepository: SearchFilterRepository =
  new PrismaSearchFilterRepository();
