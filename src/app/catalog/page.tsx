import { propertiesUseCases } from "@/modules/properties/application/property.use-cases";
import { CitySelector } from "@/components/ui/CitySelector";
import Image from "next/image";
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

        {properties.length === 0 ? (
          <div className="text-center py-32 bg-black rounded-2xl border border-gray-800">
            <p className="text-gray-500 text-xl font-medium">
              No hay propiedades que coincidan con estos filtros.
            </p>
            <Link
              href="/catalog"
              className="mt-6 inline-block text-green-400 font-bold hover:text-green-300 transition-colors"
            >
              Limpiar filtros
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.map((property) => {
              const imageUrl = property.images[0] ?? "";
              return (
                <Link
                  key={property.id}
                  href={`/catalog/${property.id}`}
                  className="bg-black rounded-2xl border border-gray-800 overflow-hidden hover:border-green-500/40 transition-colors block"
                >
                  <div className="relative h-48 bg-gray-900">
                    {imageUrl ? (
                      <Image
                        src={imageUrl}
                        alt={property.title}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-700 text-4xl">
                        🏠
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h2 className="font-bold text-white text-lg leading-tight line-clamp-2">
                        {property.title}
                      </h2>
                      <span className="shrink-0 text-xs font-bold uppercase bg-gray-800 text-gray-400 px-2 py-1 rounded-lg">
                        {property.type}
                      </span>
                    </div>
                    <p className="text-gray-500 text-sm mb-1">{property.location}</p>
                    {property.rooms != null && (
                      <p className="text-gray-500 text-sm mb-3">
                        {property.rooms} habitación{property.rooms !== 1 ? "es" : ""}
                      </p>
                    )}
                    <p className="text-green-400 font-black text-xl">
                      ${Number(property.price).toLocaleString("es-CO")}
                      <span className="text-gray-500 font-normal text-sm"> /mes</span>
                    </p>
                  </div>
                </Link>
              );
            })}
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
