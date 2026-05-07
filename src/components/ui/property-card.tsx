import Image from "next/image";
import Link from "next/link";

interface PropertyCardItem {
  id: string;
  title: string;
  description: string;
  images: string[];
  price: { toString(): string };
  location: string;
  rooms: number | null;
  type: string;
}

interface PropertyCardProps {
  property: PropertyCardItem;
  hrefBasePath?: string;
  className?: string;
}

const currencyFormat = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

export function PropertyCard({
  property,
  hrefBasePath = "/catalog",
  className,
}: PropertyCardProps) {
  const imageUrl = property.images[0] ?? "";
  const cardClasses =
    "group overflow-hidden rounded-2xl border border-gray-800 bg-black transition hover:border-green-500/40";

  return (
    <Link
      href={`${hrefBasePath}/${property.id}`}
      className={className ? `${cardClasses} ${className}` : cardClasses}
    >
      <div className="relative h-44 bg-gray-900">
        {imageUrl ? (
          <Image src={imageUrl} alt={property.title} fill className="object-cover" unoptimized />
        ) : (
          <div className="flex h-full items-center justify-center text-sm font-semibold text-gray-600">
            Sin imagen disponible
          </div>
        )}
      </div>

      <div className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 text-base font-bold text-white">{property.title}</h3>
          <span className="shrink-0 rounded-lg bg-gray-800 px-2 py-1 text-[11px] font-bold uppercase text-gray-400">
            {property.type}
          </span>
        </div>

        <p className="line-clamp-1 text-sm text-gray-500">{property.location}</p>

        {property.rooms !== null ? (
          <p className="text-xs text-gray-500">
            {property.rooms} habitacion{property.rooms === 1 ? "" : "es"}
          </p>
        ) : null}

        <p className="text-lg font-black text-green-400">
          {currencyFormat.format(Number(property.price))}
          <span className="ml-1 text-xs font-medium text-gray-500">/mes</span>
        </p>

        <p className="line-clamp-2 text-sm text-gray-400">{property.description}</p>
      </div>
    </Link>
  );
}
