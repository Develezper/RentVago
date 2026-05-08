import { FormEvent } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { CitySelector } from "@/components/ui/CitySelector";
import { FavoriteButton } from "@/components/ui/favorite-button";
import { PropertyCardSkeleton } from "@/components/ui/property-card";
import { PropertyImageCarousel } from "@/components/ui/property-image-carousel";
import {
  currencyFormat,
  FilterState,
  PropertyItem,
  SearchMeta,
  SearchPageSize,
  SearchSort,
  ViewerRole,
  pageSizeValues,
  toNumericPrice,
} from "./search-page.shared";

interface SearchHeroProps {
  query: string;
  city: string;
  isSearchDisabled: boolean;
  onCityChange: (value: string) => void;
  onQueryChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export function SearchHero({
  query,
  city,
  isSearchDisabled,
  onCityChange,
  onQueryChange,
  onSubmit,
}: SearchHeroProps) {
  return (
    <section className="rounded-3xl border border-gray-800 bg-black p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-green-400">
            Valle de Aburra
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Busca inmuebles en minutos
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            Encuentra apartamentos, casas y lofts por zona, precio y habitaciones.
          </p>
        </div>

        <form className="grid gap-3 sm:grid-cols-[1fr_auto]" onSubmit={onSubmit}>
          <label htmlFor="query" className="sr-only">
            Buscar propiedad
          </label>
          <input
            id="query"
            name="query"
            type="text"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Ej: apartamento con balcon y parqueadero"
            className="h-12 rounded-2xl border border-gray-800 bg-gray-900 px-4 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-green-500 focus:ring-1 focus:ring-green-500"
          />
          <button
            type="submit"
            disabled={isSearchDisabled}
            className="h-12 rounded-2xl bg-green-500 px-6 text-sm font-extrabold text-black transition hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Buscar ahora
          </button>
        </form>

        <div className="w-full sm:max-w-xs">
          <CitySelector
            id="city"
            value={city}
            allOptionLabel="Todas las sedes activas"
            onChange={onCityChange}
          />
        </div>
      </div>
    </section>
  );
}

interface SearchFiltersPanelProps {
  filters: FilterState;
  isSavingSearchFilter: boolean;
  isSearchAlertActive: boolean;
  hasInvalidPriceRange: boolean;
  priceRangeValidationMessage: string;
  onPriceRangeBlur: () => void;
  onFilterChange: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  onClearFilters: () => void;
  onSaveSearchFilter: () => void;
}

export function SearchFiltersPanel({
  filters,
  isSavingSearchFilter,
  isSearchAlertActive,
  hasInvalidPriceRange,
  priceRangeValidationMessage,
  onPriceRangeBlur,
  onFilterChange,
  onClearFilters,
  onSaveSearchFilter,
}: SearchFiltersPanelProps) {
  return (
    <aside className="w-full rounded-3xl border border-gray-800 bg-black p-5 shadow-sm sm:p-6">
      <h2 className="text-base font-semibold text-white">Filtros</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <div className="space-y-2 sm:col-span-2 xl:col-span-2">
          <label htmlFor="location" className="text-sm font-medium text-gray-400">
            Zona o barrio
          </label>
          <input
            id="location"
            name="location"
            type="text"
            value={filters.location}
            onChange={(event) => onFilterChange("location", event.target.value)}
            placeholder="Ej: Laureles, Robledo, El Poblado"
            className="h-11 w-full rounded-2xl border border-gray-800 bg-gray-900 px-3 text-sm text-white outline-none transition focus:border-green-500 focus:ring-1 focus:ring-green-500"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="minPrice" className="text-sm font-medium text-gray-400">
            Precio min
          </label>
          <input
            id="minPrice"
            name="minPrice"
            type="number"
            value={filters.minPrice}
            onChange={(event) => onFilterChange("minPrice", event.target.value)}
            onBlur={onPriceRangeBlur}
            placeholder="1200000"
            className="h-11 w-full rounded-2xl border border-gray-800 bg-gray-900 px-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-green-500 focus:ring-1 focus:ring-green-500"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="maxPrice" className="text-sm font-medium text-gray-400">
            Precio max
          </label>
          <input
            id="maxPrice"
            name="maxPrice"
            type="number"
            value={filters.maxPrice}
            onChange={(event) => onFilterChange("maxPrice", event.target.value)}
            onBlur={onPriceRangeBlur}
            placeholder="5000000"
            className="h-11 w-full rounded-2xl border border-gray-800 bg-gray-900 px-3 text-sm text-white outline-none transition focus:border-green-500 focus:ring-1 focus:ring-green-500"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="rooms" className="text-sm font-medium text-gray-400">
            Habitaciones
          </label>
          <select
            id="rooms"
            name="rooms"
            value={filters.rooms}
            onChange={(event) => onFilterChange("rooms", event.target.value)}
            className="h-11 w-full rounded-2xl border border-gray-800 bg-gray-900 px-3 text-sm text-white outline-none transition focus:border-green-500 focus:ring-1 focus:ring-green-500"
          >
            <option value="">Cualquiera</option>
            <option value="1">1+</option>
            <option value="2">2+</option>
            <option value="3">3+</option>
            <option value="4">4+</option>
          </select>
        </div>

        <button
          type="button"
          onClick={() => onFilterChange("verifiedOnly", !filters.verifiedOnly)}
          className={`h-11 w-full rounded-2xl border px-4 text-sm font-semibold transition sm:col-span-2 xl:col-span-2 ${
            filters.verifiedOnly
              ? "border-green-500 bg-green-500/10 text-green-300"
              : "border-gray-700 bg-gray-900 text-gray-300 hover:border-gray-600 hover:text-white"
          }`}
        >
          {filters.verifiedOnly
            ? "Mostrando Publicaciones Verificadas"
            : "Mostrar solo Publicaciones Verificadas"}
        </button>

        {hasInvalidPriceRange ? (
          <p className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-400 sm:col-span-2 xl:col-span-6">
            {priceRangeValidationMessage}
          </p>
        ) : null}

        <button
          type="button"
          onClick={onClearFilters}
          className="h-11 w-full rounded-2xl border border-gray-700 bg-gray-900 px-4 text-sm font-medium text-gray-400 transition hover:border-gray-600 hover:text-white"
        >
          Limpiar filtros
        </button>

        <button
          type="button"
          onClick={onSaveSearchFilter}
          disabled={isSavingSearchFilter || hasInvalidPriceRange}
          className={`flex h-11 w-full items-center justify-center gap-2 rounded-2xl border px-4 text-sm font-extrabold transition disabled:cursor-not-allowed disabled:opacity-50 sm:col-span-2 xl:col-span-3 ${
            isSearchAlertActive
              ? "border-green-500 bg-green-500/10 text-green-300"
              : "border-gray-700 bg-gray-900 text-white hover:border-green-500/60"
          }`}
        >
          <Bell className="h-4 w-4" />
          {isSavingSearchFilter
            ? "Activando alerta..."
            : isSearchAlertActive
              ? "Alerta activa para esta busqueda"
              : "Activar alerta para esta busqueda"}
        </button>
      </div>
    </aside>
  );
}

interface SearchResultsToolbarProps {
  totalProperties: number;
  viewerRole: ViewerRole;
  pdfDownloadHref: string;
  sort: SearchSort;
  pageSize: SearchPageSize;
  isLoading: boolean;
  onSortChange: (value: SearchSort) => void;
  onPageSizeChange: (value: SearchPageSize) => void;
}

export function SearchResultsToolbar({
  totalProperties,
  viewerRole,
  pdfDownloadHref,
  sort,
  pageSize,
  isLoading,
  onSortChange,
  onPageSizeChange,
}: SearchResultsToolbarProps) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-gray-800 bg-black px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-gray-400">
        <span className="font-semibold text-white">{totalProperties}</span> propiedades disponibles
      </p>

      <div className="flex flex-wrap items-center gap-3">
        {viewerRole === "ADMIN" ? (
          <a
            href={pdfDownloadHref}
            className="inline-flex h-9 items-center rounded-lg border border-green-500/30 bg-green-500/10 px-3 text-sm font-medium text-green-400 transition hover:bg-green-500/20"
          >
            Descargar PDF
          </a>
        ) : null}
        <label htmlFor="sort" className="text-sm font-medium text-gray-400">
          Ordenar
        </label>
        <select
          id="sort"
          name="sort"
          value={sort}
          onChange={(event) => onSortChange(event.target.value as SearchSort)}
          className="h-9 rounded-lg border border-gray-800 bg-gray-900 px-3 text-sm text-white outline-none transition focus:border-green-500 focus:ring-1 focus:ring-green-500"
        >
          <option value="relevance">Relevancia</option>
          <option value="newest">Mas recientes</option>
          <option value="priceAsc">Precio: menor a mayor</option>
          <option value="priceDesc">Precio: mayor a menor</option>
        </select>

        <label htmlFor="pageSize" className="text-sm font-medium text-gray-400">
          Mostrar
        </label>
        <select
          id="pageSize"
          name="pageSize"
          value={String(pageSize)}
          onChange={(event) => onPageSizeChange(Number(event.target.value) as SearchPageSize)}
          className="h-9 rounded-lg border border-gray-800 bg-gray-900 px-3 text-sm text-white outline-none transition focus:border-green-500 focus:ring-1 focus:ring-green-500"
        >
          {pageSizeValues.map((size) => (
            <option key={size} value={String(size)}>
              {size}
            </option>
          ))}
        </select>

        {isLoading ? (
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-green-400">
            Cargando...
          </span>
        ) : null}
      </div>
    </div>
  );
}

interface SearchLoadingSkeletonProps {
  items?: number;
}

export function SearchLoadingSkeleton({ items = 6 }: SearchLoadingSkeletonProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: items }).map((_, index) => (
        <PropertyCardSkeleton
          key={`search-skeleton-${index}`}
          imageHeightClassName="h-36"
        />
      ))}
    </div>
  );
}

interface SearchEmptyStateProps {
  city?: string;
  query?: string;
  isAlertActive: boolean;
  isActivatingAlert: boolean;
  canActivateAlert: boolean;
  onActivateImmediateAlert: () => void;
}

export function SearchEmptyState({
  city,
  query,
  isAlertActive,
  isActivatingAlert,
  canActivateAlert,
  onActivateImmediateAlert,
}: SearchEmptyStateProps) {
  const searchSummary = [
    city?.trim() ? `Ciudad: ${city.trim()}` : null,
    query?.trim() ? `Busqueda: ${query.trim()}` : null,
  ].filter((value): value is string => value !== null);

  return (
    <div className="relative overflow-hidden rounded-3xl border border-gray-800 bg-black px-4 py-10 text-center shadow-sm sm:px-6">
      <div className="pointer-events-none absolute inset-0 bg-radial-[ellipse_at_top] from-green-500/12 via-transparent to-transparent" />
      <div className="relative mx-auto max-w-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-green-400">
          Cero resultados
        </p>
        <p className="mt-2 text-lg font-bold text-white">
          No encontramos propiedades con esos filtros.
        </p>
        <p className="mt-2 text-sm text-gray-400">
          Evita perder esta oportunidad: activa una alerta para recibir el primer match
          disponible con tus criterios actuales.
        </p>

        {searchSummary.length > 0 ? (
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {searchSummary.map((item) => (
              <span
                key={item}
                className="rounded-full border border-gray-700 bg-gray-900 px-3 py-1 text-xs font-semibold text-gray-300"
              >
                {item}
              </span>
            ))}
          </div>
        ) : null}

        <button
          type="button"
          onClick={onActivateImmediateAlert}
          disabled={!canActivateAlert || isActivatingAlert || isAlertActive}
          className="mt-6 inline-flex h-11 items-center gap-2 rounded-2xl bg-green-500 px-5 text-sm font-extrabold text-black transition hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Bell className="h-4 w-4" />
          {isActivatingAlert
            ? "Activando alerta..."
            : isAlertActive
              ? "Alerta activa para esta busqueda"
              : "Activar Alerta de Match Inmediato"}
        </button>
      </div>
    </div>
  );
}

interface PropertyGridProps {
  properties: PropertyItem[];
  favoritePropertyIds: string[];
  onFavoriteToggle?: (propertyId: string, isFavorite: boolean) => void;
}

export function PropertyGrid({
  properties,
  favoritePropertyIds,
  onFavoriteToggle,
}: PropertyGridProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {properties.map((property) => {
        const isFavorite = favoritePropertyIds.includes(property.id);

        return (
          <article
            key={property.id}
            className="relative overflow-hidden rounded-2xl border border-gray-800 bg-black shadow-sm transition hover:-translate-y-0.5 hover:border-gray-700 hover:shadow-[0_4px_20px_rgba(0,0,0,0.6)]"
          >
            <FavoriteButton
              key={`${property.id}-${isFavorite ? "1" : "0"}`}
              propertyId={property.id}
              initialIsFavorite={isFavorite}
              onToggle={
                onFavoriteToggle
                  ? (nextFavorite) => onFavoriteToggle(property.id, nextFavorite)
                  : undefined
              }
              className="absolute right-3 top-3 z-10"
            />

            <PropertyImageCarousel
              images={property.images}
              alt={property.title}
              heightClassName="h-36"
              badgeLabel="Propiedad"
            />

            <div className="space-y-3 p-4">
              <div>
                <h3 className="line-clamp-2 text-base font-semibold text-white">
                  {property.title}
                </h3>
                <p className="mt-1 text-sm text-gray-500">{property.location}</p>
              </div>

              <p className="text-lg font-bold text-green-400">
                {currencyFormat.format(toNumericPrice(property.price))}
                <span className="ml-1 text-xs font-medium text-gray-500">/ mes</span>
              </p>

              <p className="line-clamp-2 text-sm text-gray-400">{property.description}</p>

              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span className="rounded-full bg-gray-800 px-2.5 py-1">
                  {property.rooms} hab
                </span>
              </div>

              <div className="pt-1">
                <Link
                  href={`/search/${property.id}`}
                  className="inline-flex h-9 items-center rounded-lg border border-gray-700 bg-gray-900 px-3 text-sm font-medium text-white transition hover:border-gray-600 hover:bg-gray-800"
                >
                  Ver detalle
                </Link>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

interface SearchPaginationProps {
  meta: SearchMeta;
  isLoading: boolean;
  currentPage: number;
  onPrevious: () => void;
  onNext: () => void;
}

export function SearchPagination({
  meta,
  isLoading,
  currentPage,
  onPrevious,
  onNext,
}: SearchPaginationProps) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-gray-800 bg-black px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-gray-400">
        Pagina {meta.page} de {meta.totalPages}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onPrevious}
          disabled={isLoading || currentPage <= 1}
          className="h-9 rounded-lg border border-gray-700 bg-gray-900 px-3 text-sm font-medium text-gray-400 transition hover:border-gray-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          Anterior
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={isLoading || currentPage >= meta.totalPages}
          className="h-9 rounded-lg border border-gray-700 bg-gray-900 px-3 text-sm font-medium text-gray-400 transition hover:border-gray-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}
