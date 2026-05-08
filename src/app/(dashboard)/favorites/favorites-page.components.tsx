import Link from "next/link";
import { FavoriteButton } from "@/components/ui/favorite-button";
import { FavoriteItem, currencyFormat, toNumericPrice } from "./favorites-page.shared";

export function FavoritesHero() {
  return (
    <section className="rounded-3xl border border-gray-800 bg-black p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-green-400">
        Favoritos
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
        Propiedades guardadas
      </h1>
      <p className="mt-2 text-sm text-gray-400">
        Administra tus inmuebles favoritos para hacer seguimiento rapido.
      </p>
    </section>
  );
}

export function FavoritesLoadingSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={`favorite-skeleton-${index}`}
          className="animate-pulse overflow-hidden rounded-2xl border border-gray-800 bg-black shadow-sm"
        >
          <div className="h-36 bg-gray-800" />
          <div className="space-y-3 p-4">
            <div className="h-4 rounded bg-gray-800" />
            <div className="h-4 w-2/3 rounded bg-gray-800" />
            <div className="h-5 w-1/2 rounded bg-gray-800" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function FavoritesEmptyState() {
  return (
    <div className="rounded-2xl border border-gray-800 bg-black px-4 py-10 text-center shadow-sm">
      <p className="text-base font-medium text-white">Aun no tienes propiedades favoritas.</p>
      <p className="mt-1 text-sm text-gray-400">
        Explora resultados y guarda las que mas te interesen.
      </p>
      <Link
        href="/search"
        className="mt-5 inline-flex h-10 items-center rounded-2xl bg-green-500 px-4 text-sm font-extrabold text-black transition hover:bg-green-400"
      >
        Ir a buscar propiedades
      </Link>
    </div>
  );
}

interface FavoritesGridProps {
  favorites: FavoriteItem[];
  onToggle: (propertyId: string, isFavorite: boolean) => void;
}

export function FavoritesGrid({ favorites, onToggle }: FavoritesGridProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {favorites.map((favorite) => (
        <article
          key={favorite.id}
          className="relative overflow-hidden rounded-2xl border border-gray-800 bg-black shadow-sm transition hover:-translate-y-0.5 hover:border-gray-700 hover:shadow-[0_4px_20px_rgba(0,0,0,0.6)]"
        >
          <FavoriteButton
            propertyId={favorite.propertyId}
            initialIsFavorite={true}
            onToggle={(isFavorite) => onToggle(favorite.propertyId, isFavorite)}
            className="absolute right-3 top-3 z-10"
          />
          <Link href={`/search/${favorite.propertyId}`} className="block">
            <div
              className="relative h-36 bg-linear-to-br from-red-900/20 via-gray-800 to-gray-900 bg-cover bg-center"
              style={{
                backgroundImage: favorite.property.imageUrl
                  ? `linear-gradient(to top, rgba(0,0,0,0.4), rgba(0,0,0,0.1)), url(${favorite.property.imageUrl})`
                  : undefined,
              }}
            >
              <span className="absolute bottom-3 left-3 rounded-full bg-black/80 px-3 py-1 text-xs font-semibold text-red-400">
                Favorito
              </span>
            </div>
          </Link>
          <div className="space-y-3 p-4">
            <div>
              <h2 className="line-clamp-2 text-base font-semibold text-white">
                {favorite.property.title}
              </h2>
              <p className="mt-1 text-sm text-gray-500">{favorite.property.location}</p>
            </div>

            <p className="text-lg font-bold text-green-400">
              {currencyFormat.format(toNumericPrice(favorite.property.price))}
              <span className="ml-1 text-xs font-medium text-gray-500">/ mes</span>
            </p>

            <p className="line-clamp-2 text-sm text-gray-400">{favorite.property.description}</p>

            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span className="rounded-full bg-gray-800 px-2.5 py-1">
                {favorite.property.rooms} hab
              </span>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
