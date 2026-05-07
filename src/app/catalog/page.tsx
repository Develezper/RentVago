import { propertiesUseCases } from "@/modules/properties/application/property.use-cases";
import { CitySelector } from "@/components/ui/CitySelector";
import { PropertyCard } from "@/components/ui/property-card";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface CatalogSearchParams {
  query?: string;
  city?: string;
  minPrice?: string;
  maxPrice?: string;
}

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<CatalogSearchParams>;
}) {
  const params = await searchParams;
  const query = params.query?.trim() ?? "";
  const city = params.city?.trim() ?? "";
  const minPrice = params.minPrice ? parseFloat(params.minPrice) : undefined;
  const maxPrice = params.maxPrice ? parseFloat(params.maxPrice) : undefined;

  const { items: properties } = await propertiesUseCases.listPublicProperties({
    page: 1,
    limit: 48,
    query,
    city,
    minPrice,
    maxPrice,
  });

  const catalogCards = properties.map((property) => ({
    ...property,
    price: property.price.toString(),
  }));

  const prefilledSearchParams = new URLSearchParams();
  if (query.length > 0) prefilledSearchParams.set("query", query);
  if (city.length > 0) prefilledSearchParams.set("city", city);
  if (params.minPrice?.trim()) prefilledSearchParams.set("minPrice", params.minPrice);
  if (params.maxPrice?.trim()) prefilledSearchParams.set("maxPrice", params.maxPrice);

  const prefixedSearchHref = prefilledSearchParams.size
    ? `/search?${prefilledSearchParams.toString()}`
    : "/search";
  const activateAlertHref = `/login?next=${encodeURIComponent(prefixedSearchHref)}`;

  const minPriceLabel =
    params.minPrice && Number.isFinite(Number(params.minPrice))
      ? Number(params.minPrice).toLocaleString("es-CO")
      : null;
  const maxPriceLabel =
    params.maxPrice && Number.isFinite(Number(params.maxPrice))
      ? Number(params.maxPrice).toLocaleString("es-CO")
      : null;

  const activeFilters = [
    city ? `Ciudad: ${city}` : null,
    query ? `Busqueda: ${query}` : null,
    minPriceLabel ? `Min: ${minPriceLabel}` : null,
    maxPriceLabel ? `Max: ${maxPriceLabel}` : null,
  ].filter((value): value is string => value !== null);

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-10">
          <h1 className="text-4xl font-black tracking-tight text-white mb-2">
            Descubre tu próximo hogar
          </h1>
          <p className="text-gray-400 text-lg font-medium">
            Encuentra los mejores arriendos verificados por RentVago.
          </p>
        </div>

        <form method="GET" className="mb-10 flex flex-col sm:flex-row gap-3">
          <div className="w-full sm:w-56">
            <CitySelector
              id="catalog-city"
              name="city"
              value={city}
              allOptionLabel="Todas las sedes"
            />
          </div>
          <input
            name="query"
            defaultValue={query}
            placeholder="Buscar por título o ubicación..."
            className="flex-1 rounded-2xl bg-gray-900 border border-gray-800 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <input
            name="minPrice"
            defaultValue={params.minPrice ?? ""}
            type="number"
            placeholder="Precio mínimo"
            className="w-40 rounded-2xl bg-gray-900 border border-gray-800 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <input
            name="maxPrice"
            defaultValue={params.maxPrice ?? ""}
            type="number"
            placeholder="Precio máximo"
            className="w-40 rounded-2xl bg-gray-900 border border-gray-800 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <button
            type="submit"
            className="rounded-2xl bg-green-500 px-6 py-3 font-extrabold text-black hover:bg-green-400 transition-colors"
          >
            Buscar
          </button>
        </form>

        {catalogCards.length === 0 ? (
          <div className="relative overflow-hidden rounded-3xl border border-gray-800 bg-black px-6 py-16 text-center">
            <div className="pointer-events-none absolute inset-0 bg-radial-[ellipse_at_top] from-green-500/12 via-transparent to-transparent" />
            <div className="relative mx-auto max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-green-400">
                Sin coincidencias por ahora
              </p>
              <h2 className="mt-3 text-3xl font-black text-white">
                No encontramos resultados para esta busqueda
              </h2>
              <p className="mt-4 text-sm text-gray-400">
                Convierte esta busqueda en una oportunidad: activa una alerta y te avisaremos
                apenas entre una propiedad que haga match con estos criterios.
              </p>

              {activeFilters.length > 0 ? (
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  {activeFilters.map((filter) => (
                    <span
                      key={filter}
                      className="rounded-full border border-gray-700 bg-gray-900 px-3 py-1 text-xs font-semibold text-gray-300"
                    >
                      {filter}
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href={activateAlertHref}
                  className="inline-flex h-12 items-center rounded-2xl bg-green-500 px-6 text-sm font-extrabold text-black transition hover:bg-green-400"
                >
                  Activar Alerta de Match Inmediato
                </Link>
                <Link
                  href="/catalog"
                  className="inline-flex h-12 items-center rounded-2xl border border-gray-700 bg-gray-900 px-6 text-sm font-semibold text-gray-300 transition hover:border-gray-600 hover:text-white"
                >
                  Limpiar filtros
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {catalogCards.map((property, index) => (
              <PropertyCard
                key={property.id}
                property={property}
                className="h-full"
                priority={index < 3}
              />
            ))}
          </div>
        )}

        <div className="mt-12 text-center">
          <Link
            href="/login"
            className="inline-block rounded-2xl bg-green-500 px-8 py-4 font-extrabold text-black text-lg hover:bg-green-400 transition-colors"
          >
            Iniciar sesión para ver más detalles
          </Link>
        </div>
      </div>
    </main>
  );
}
