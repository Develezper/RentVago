import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { FavoriteButton } from "@/components/ui/favorite-button";
import { resolveAuthenticatedUserFromHeaders } from "@/lib/api-auth";
import { favoritesUseCases } from "@/modules/properties/application/favorite.use-cases";
import { propertiesUseCases } from "@/modules/properties/application/property.use-cases";

interface PropertyDetailPageProps {
  params: Promise<{ id: string }>;
}

const currencyFormat = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

const getAuthenticatedUserId = async (): Promise<string | null> => {
  const requestHeaders = await headers();
  return resolveAuthenticatedUserFromHeaders(requestHeaders)?.userId ?? null;
};

export default async function PropertyDetailPage({ params }: PropertyDetailPageProps) {
  const { id } = await params;
  const property = await propertiesUseCases.getPropertyById(id);
  const userId = await getAuthenticatedUserId();
  const isFavorite =
    userId !== null ? await favoritesUseCases.isPropertyFavorite(userId, id) : false;

  if (!property) {
    notFound();
  }

  const monthlyPrice = currencyFormat.format(Number(property.price));
  const rooms = property.rooms ?? 0;
  const estimatedBathrooms = Math.max(1, Math.floor(rooms / 2) + 1);
  const estimatedArea = rooms * 28 + 24;
  const whatsappText = encodeURIComponent(
    `Hola, me interesa la propiedad "${property.title}" (${property.location}).`,
  );
  const whatsappUrl = `https://wa.me/573001112233?text=${whatsappText}`;
  const primaryImage = property.images[0] ?? "";
  const secondaryImage = property.images[1] ?? primaryImage;
  const tertiaryImage = property.images[2] ?? primaryImage;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/search"
          className="inline-flex h-9 items-center rounded-lg border border-gray-700 bg-gray-900 px-3 text-sm font-medium text-gray-400 transition hover:border-gray-600 hover:text-white"
        >
          Volver
        </Link>
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-green-400">
          Detalle de propiedad
        </p>
      </div>

      <header className="rounded-3xl border border-gray-800 bg-black p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-gray-500">{property.location}</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
              {property.title}
            </h1>
            <p className="mt-3 text-2xl font-bold text-green-400">
              {monthlyPrice}
              <span className="ml-2 text-sm font-medium text-gray-500">/ mes</span>
            </p>
          </div>
          <FavoriteButton propertyId={property.id} initialIsFavorite={isFavorite} />
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <section className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
            <div
              className="h-72 rounded-3xl bg-gradient-to-br from-green-900/20 via-gray-800 to-gray-900 bg-cover bg-center sm:h-96"
              style={{
                backgroundImage: primaryImage
                  ? `linear-gradient(to top, rgba(0,0,0,0.5), rgba(0,0,0,0.1)), url(${primaryImage})`
                  : undefined,
              }}
            />
            <div className="grid gap-3 sm:grid-rows-2">
              <div
                className="h-36 rounded-2xl bg-gradient-to-br from-gray-800 via-gray-800 to-gray-900 bg-cover bg-center sm:h-auto"
                style={{
                  backgroundImage: secondaryImage
                    ? `linear-gradient(to top, rgba(0,0,0,0.4), rgba(0,0,0,0.1)), url(${secondaryImage})`
                    : undefined,
                }}
              />
              <div
                className="h-36 rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 bg-cover bg-center sm:h-auto"
                style={{
                  backgroundImage: tertiaryImage
                    ? `linear-gradient(to top, rgba(0,0,0,0.4), rgba(0,0,0,0.1)), url(${tertiaryImage})`
                    : undefined,
                }}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-gray-800 bg-black p-4 shadow-sm">
              <p className="text-xs uppercase tracking-[0.14em] text-gray-500">Habitaciones</p>
              <p className="mt-1 text-xl font-semibold text-white">{rooms}</p>
            </div>
            <div className="rounded-2xl border border-gray-800 bg-black p-4 shadow-sm">
              <p className="text-xs uppercase tracking-[0.14em] text-gray-500">Banos</p>
              <p className="mt-1 text-xl font-semibold text-white">{estimatedBathrooms}</p>
            </div>
            <div className="rounded-2xl border border-gray-800 bg-black p-4 shadow-sm">
              <p className="text-xs uppercase tracking-[0.14em] text-gray-500">Area</p>
              <p className="mt-1 text-xl font-semibold text-white">{estimatedArea} m²</p>
            </div>
            <div className="rounded-2xl border border-gray-800 bg-black p-4 shadow-sm">
              <p className="text-xs uppercase tracking-[0.14em] text-gray-500">Ubicacion</p>
              <p className="mt-1 text-base font-semibold text-white">{property.location}</p>
            </div>
          </div>

          <article className="rounded-3xl border border-gray-800 bg-black p-6 shadow-sm">
            <h2 className="text-xl font-semibold tracking-tight text-white">Descripcion</h2>
            <p className="mt-3 whitespace-pre-line leading-7 text-gray-400">
              {property.description}
            </p>
          </article>
        </section>

        <aside className="h-fit rounded-3xl border border-gray-800 bg-black p-6 shadow-sm xl:sticky xl:top-24">
          <p className="text-sm font-medium text-gray-500">Asesoria inmediata</p>
          <h3 className="mt-2 text-xl font-semibold text-white">Agenda tu visita</h3>
          <p className="mt-2 text-sm leading-6 text-gray-400">
            Nuestro equipo te acompana en el proceso de arriendo con atencion personalizada.
          </p>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-2xl bg-green-500 px-4 text-sm font-extrabold text-black transition hover:bg-green-400 shadow-[0_0_15px_rgba(34,197,94,0.3)] hover:shadow-[0_0_25px_rgba(34,197,94,0.5)]"
          >
            Contactar por WhatsApp
          </a>
        </aside>
      </div>
    </div>
  );
}
