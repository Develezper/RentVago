import { SearchLoadingSkeleton } from "./search-page.components";
import { headers } from "next/headers";
import { Suspense } from "react";
import { resolveAuthenticatedUserFromHeaders } from "@/lib/api-auth";
import { favoritesUseCases } from "@/modules/properties/application/favorite.use-cases";
import {
  propertiesUseCases,
  type PropertySearchFilters,
} from "@/modules/properties/application/property.use-cases";
import { searchFilterUseCases } from "@/modules/properties/application/search-filter.use-cases";
import {
  buildPdfDownloadHref,
  type FilterState,
  PAGE_SIZE,
  parseStateFromUrl,
  type ViewerRole,
} from "./search-page.shared";
import { SearchPageClient } from "./search-page.client";

interface SearchPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

const firstSearchParamValue = (value: string | string[] | undefined): string | undefined => {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0];
  return undefined;
};

const toUrlSearchParams = (
  rawSearchParams: { [key: string]: string | string[] | undefined },
): URLSearchParams => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(rawSearchParams)) {
    const normalizedValue = firstSearchParamValue(value);
    if (normalizedValue !== undefined) params.set(key, normalizedValue);
  }
  return params;
};

const toServiceFilters = (
  filters: FilterState,
  page: number,
  pageSize: number,
): PropertySearchFilters => {
  const minPriceRaw = filters.minPrice.trim();
  const maxPriceRaw = filters.maxPrice.trim();
  const roomsRaw = filters.rooms.trim();
  const minPrice = minPriceRaw.length > 0 ? Number(minPriceRaw) : Number.NaN;
  const maxPrice = maxPriceRaw.length > 0 ? Number(maxPriceRaw) : Number.NaN;
  const rooms = roomsRaw.length > 0 ? Number(roomsRaw) : Number.NaN;

  return {
    query: filters.query.trim() || undefined,
    city: filters.city.trim() || undefined,
    location: filters.location.trim() || undefined,
    minPrice: Number.isFinite(minPrice) ? minPrice : undefined,
    maxPrice: Number.isFinite(maxPrice) ? maxPrice : undefined,
    rooms: Number.isFinite(rooms) ? rooms : undefined,
    verifiedOnly: filters.verifiedOnly,
    sort: filters.sort,
    page,
    pageSize,
  };
};

const getAuthenticatedViewer = async (): Promise<{
  userId: string | null;
  role: ViewerRole;
}> => {
  const requestHeaders = await headers();
  const authenticatedUser = resolveAuthenticatedUserFromHeaders(requestHeaders);

  if (!authenticatedUser) {
    return { userId: null, role: "EMPLOYEE" };
  }

  return { userId: authenticatedUser.userId, role: authenticatedUser.role };
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const resolvedSearchParams = await searchParams;
  const params = toUrlSearchParams(resolvedSearchParams);
  const queryString = params.toString();
  const initialState = parseStateFromUrl(queryString.length > 0 ? `?${queryString}` : "");
  const { userId, role } = await getAuthenticatedViewer();

  const [results, favoriteItems, savedSearchFilters] = await Promise.all([
    propertiesUseCases.searchProperties(
      toServiceFilters(initialState.filters, initialState.page, initialState.pageSize),
    ),
    userId === null
      ? Promise.resolve([])
      : favoritesUseCases.listFavoritePropertyIdsForUser(userId),
    userId === null ? Promise.resolve([]) : searchFilterUseCases.listForUser(userId),
  ]);

  const favoritePropertyIds = favoriteItems.map((favorite) => favorite.propertyId);
  const currentPageSize =
    results.meta.pageSize === 6 || results.meta.pageSize === 24
      ? results.meta.pageSize
      : PAGE_SIZE;

  return (
    <Suspense fallback={<SearchLoadingSkeleton />}>
      <SearchPageClient
        key={queryString || "default-search"}
        initialFilters={initialState.filters}
        savedSearchFilters={savedSearchFilters}
        initialProperties={results.data}
        initialFavoritePropertyIds={favoritePropertyIds}
        currentPage={results.meta.page}
        currentPageSize={currentPageSize}
        meta={results.meta}
        viewerRole={role}
        pdfDownloadHref={buildPdfDownloadHref(initialState.filters)}
      />
    </Suspense>
  );
}
