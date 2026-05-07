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
  type SearchMeta,
  type SearchPageSize,
  type SearchSort,
  toSaveSearchFilterPayload,
  type ViewerRole,
} from "./search-page.shared";

interface SearchPageClientProps {
  initialFilters: FilterState;
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
  const [saveSearchFilterMessage, setSaveSearchFilterMessage] = useState<string>("");
  const [isSavingSearchFilter, setIsSavingSearchFilter] = useState<boolean>(false);

  const hasInvalidPriceRange = hasInvalidPriceRangeForFilters(filters);
  const priceRangeValidationMessage = hasInvalidPriceRange
    ? "El precio minimo no puede ser mayor que el precio maximo."
    : "";

  const committedQueryString = searchParams.toString();
  const totalProperties = meta.total;

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
      setSaveSearchFilterMessage("");
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
    setSaveSearchFilterMessage("");
    setFilters(defaultFilters);
    commitImmediate(defaultFilters);
  }, [commitImmediate]);

  const commitDraftFilters = useCallback(() => {
    setSaveSearchFilterMessage("");
    commitImmediate(filters);
  }, [commitImmediate, filters]);

  const setSort = useCallback(
    (value: SearchSort) => {
      setSaveSearchFilterMessage("");
      const nextFilters = updateFilters((previous) => ({ ...previous, sort: value }));
      commitImmediate(nextFilters);
    },
    [commitImmediate, updateFilters],
  );

  const setPageSize = useCallback(
    (value: SearchPageSize) => {
      setSaveSearchFilterMessage("");
      setPageSizeState(value);
      navigateToState(filters, 1, value);
    },
    [filters, navigateToState],
  );

  const saveSearchFilter = useCallback(() => {
    if (hasInvalidPriceRange) {
      setSaveSearchFilterMessage("Corrige el rango de precios antes de guardar.");
      return;
    }
    if (isSavingSearchFilter) return;

    const run = async () => {
      setIsSavingSearchFilter(true);
      setSaveSearchFilterMessage("");
      const result = await requestSaveSearchFilter(filters);
      setSaveSearchFilterMessage(result.ok ? "Busqueda guardada." : (result.error ?? ""));
      setIsSavingSearchFilter(false);
    };

    void run();
  }, [filters, hasInvalidPriceRange, isSavingSearchFilter]);

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
          hasInvalidPriceRange={hasInvalidPriceRange}
          priceRangeValidationMessage={priceRangeValidationMessage}
          saveSearchFilterMessage={saveSearchFilterMessage}
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
