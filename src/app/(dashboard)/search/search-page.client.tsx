"use client";

import { ReactNode, useCallback, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  SearchFiltersPanel,
  SearchHero,
  SearchPagination,
  SearchResultsToolbar,
} from "./search-page.components";
import {
  buildSearchParams,
  defaultFilters,
  type FilterState,
  type SavedSearchFilterItem,
  type SearchMeta,
  type SearchPageSize,
  type SearchSort,
  toSaveSearchFilterPayload,
  type ViewerRole,
} from "./search-page.shared";
import { toast } from "sonner";

interface SearchPageClientProps {
  initialFilters: FilterState;
  savedSearchFilters: SavedSearchFilterItem[];
  currentPage: number;
  currentPageSize: SearchPageSize;
  meta: SearchMeta;
  viewerRole: ViewerRole;
  pdfDownloadHref: string;
  children: ReactNode;
}

interface RequestResult {
  ok: boolean;
  error?: string;
}

const buildFilterSignature = (filters: FilterState): string => {
  return JSON.stringify(toSaveSearchFilterPayload(filters));
};

const buildSavedFilterSignature = (savedFilter: SavedSearchFilterItem): string => {
  const minPrice = savedFilter.minPrice === null ? undefined : Number(savedFilter.minPrice);
  const maxPrice = savedFilter.maxPrice === null ? undefined : Number(savedFilter.maxPrice);

  return JSON.stringify({
    query: savedFilter.query ?? undefined,
    location: savedFilter.location ?? undefined,
    minPrice: Number.isFinite(minPrice) ? minPrice : undefined,
    maxPrice: Number.isFinite(maxPrice) ? maxPrice : undefined,
    rooms: savedFilter.rooms ?? undefined,
  });
};

const isDeferredFilterKey = (key: keyof FilterState): boolean =>
  key === "query" || key === "minPrice" || key === "maxPrice";

const hasInvalidPriceRangeForFilters = (filters: FilterState): boolean => {
  const minPriceRaw = filters.minPrice.trim();
  const maxPriceRaw = filters.maxPrice.trim();

  if (minPriceRaw.length === 0 || maxPriceRaw.length === 0) return false;

  const minPrice = Number(minPriceRaw);
  const maxPrice = Number(maxPriceRaw);

  if (!Number.isFinite(minPrice) || !Number.isFinite(maxPrice)) return false;

  return minPrice > maxPrice;
};

const extractApiError = (payload: unknown, fallbackMessage: string): string => {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "error" in payload &&
    typeof payload.error === "string"
  ) {
    return payload.error;
  }
  return fallbackMessage;
};

const requestSaveSearchFilter = async (filters: FilterState): Promise<RequestResult> => {
  try {
    const response = await fetch("/api/search-filters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(toSaveSearchFilterPayload(filters)),
    });

    if (response.ok) return { ok: true };

    const payload: unknown = await response.json();
    return {
      ok: false,
      error: extractApiError(payload, "No pudimos guardar el filtro. Intenta nuevamente."),
    };
  } catch {
    return { ok: false, error: "Error de red al guardar la busqueda." };
  }
};

export function SearchPageClient({
  initialFilters,
  savedSearchFilters,
  currentPage,
  currentPageSize,
  meta,
  viewerRole,
  pdfDownloadHref,
  children,
}: SearchPageClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [pageSize, setPageSizeState] = useState<SearchPageSize>(currentPageSize);
  const [isSavingSearchFilter, setIsSavingSearchFilter] = useState<boolean>(false);
  const [savedFilterSignatures, setSavedFilterSignatures] = useState<Set<string>>(
    () => new Set(savedSearchFilters.map(buildSavedFilterSignature)),
  );

  const hasInvalidPriceRange = hasInvalidPriceRangeForFilters(filters);
  const priceRangeValidationMessage = hasInvalidPriceRange
    ? "El precio minimo no puede ser mayor que el precio maximo."
    : "";

  const committedQueryString = searchParams.toString();
  const totalProperties = meta.total;
  const currentFilterSignature = useMemo(() => buildFilterSignature(filters), [filters]);
  const isSearchAlertActive = savedFilterSignatures.has(currentFilterSignature);

  const navigateToState = useCallback(
    (nextFilters: FilterState, nextPage: number, nextPageSize: SearchPageSize) => {
      if (hasInvalidPriceRangeForFilters(nextFilters)) return;

      const nextQueryString = buildSearchParams(nextFilters, nextPage, nextPageSize).toString();
      if (nextQueryString === committedQueryString) return;

      startTransition(() => {
        router.replace(`${pathname}?${nextQueryString}`, { scroll: false });
      });
    },
    [committedQueryString, pathname, router, startTransition],
  );

  const commitImmediate = useCallback(
    (nextFilters: FilterState, nextPage = 1, nextPageSize = pageSize) => {
      navigateToState(nextFilters, nextPage, nextPageSize);
    },
    [navigateToState, pageSize],
  );

  const updateFilters = useCallback(
    (updater: (previous: FilterState) => FilterState): FilterState => {
      let nextFilters = initialFilters;
      setFilters((previous) => {
        nextFilters = updater(previous);
        return nextFilters;
      });
      return nextFilters;
    },
    [initialFilters],
  );

  const setFilterValue = useCallback(
    <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
      const nextFilters = updateFilters((previous) => ({ ...previous, [key]: value }));
      if (!isDeferredFilterKey(key)) commitImmediate(nextFilters);
    },
    [commitImmediate, updateFilters],
  );

  const submitSearch = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      commitImmediate(filters);
    },
    [commitImmediate, filters],
  );

  const clearFilters = useCallback(() => {
    setFilters(defaultFilters);
    commitImmediate(defaultFilters);
  }, [commitImmediate]);

  const commitDraftFilters = useCallback(() => {
    commitImmediate(filters);
  }, [commitImmediate, filters]);

  const setSort = useCallback(
    (value: SearchSort) => {
      const nextFilters = updateFilters((previous) => ({ ...previous, sort: value }));
      commitImmediate(nextFilters);
    },
    [commitImmediate, updateFilters],
  );

  const setPageSize = useCallback(
    (value: SearchPageSize) => {
      setPageSizeState(value);
      navigateToState(filters, 1, value);
    },
    [filters, navigateToState],
  );

  const saveSearchFilter = useCallback(() => {
    if (hasInvalidPriceRange) {
      toast.error("Corrige el rango de precios antes de activar la alerta.");
      return;
    }
    if (isSavingSearchFilter) return;
    if (isSearchAlertActive) {
      toast.success("La alerta para esta búsqueda ya está activa.");
      return;
    }

    const run = async () => {
      setIsSavingSearchFilter(true);
      const result = await requestSaveSearchFilter(filters);

      if (result.ok) {
        setSavedFilterSignatures((previous) => {
          const next = new Set(previous);
          next.add(currentFilterSignature);
          return next;
        });
        toast.success("Alerta activada. Te avisaremos cuando aparezca un match.");
      } else {
        toast.error(result.error ?? "No pudimos activar la alerta.");
      }

      setIsSavingSearchFilter(false);
    };

    void run();
  }, [
    currentFilterSignature,
    filters,
    hasInvalidPriceRange,
    isSavingSearchFilter,
    isSearchAlertActive,
  ]);

  const goToPreviousPage = useCallback(() => {
    navigateToState(filters, Math.max(1, currentPage - 1), pageSize);
  }, [currentPage, filters, navigateToState, pageSize]);

  const goToNextPage = useCallback(() => {
    navigateToState(filters, Math.min(meta.totalPages, currentPage + 1), pageSize);
  }, [currentPage, filters, meta.totalPages, navigateToState, pageSize]);

  const resultsContent = useMemo(() => children, [children]);

  return (
    <div className="space-y-6">
      <SearchHero
        query={filters.query}
        isSearchDisabled={hasInvalidPriceRange}
        onQueryChange={(value) => setFilterValue("query", value)}
        onSubmit={submitSearch}
      />

      <section className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <SearchFiltersPanel
          filters={filters}
          isSavingSearchFilter={isSavingSearchFilter}
          isSearchAlertActive={isSearchAlertActive}
          hasInvalidPriceRange={hasInvalidPriceRange}
          priceRangeValidationMessage={priceRangeValidationMessage}
          onFilterChange={setFilterValue}
          onPriceRangeBlur={commitDraftFilters}
          onClearFilters={clearFilters}
          onSaveSearchFilter={saveSearchFilter}
        />

        <div className="space-y-4">
          <SearchResultsToolbar
            totalProperties={totalProperties}
            viewerRole={viewerRole}
            pdfDownloadHref={pdfDownloadHref}
            sort={filters.sort}
            pageSize={pageSize}
            isLoading={isPending}
            onSortChange={setSort}
            onPageSizeChange={setPageSize}
          />

          {resultsContent}

          {meta.totalPages > 1 ? (
            <SearchPagination
              meta={meta}
              isLoading={isPending}
              currentPage={currentPage}
              onPrevious={goToPreviousPage}
              onNext={goToNextPage}
            />
          ) : null}
        </div>
      </section>
    </div>
  );
}
