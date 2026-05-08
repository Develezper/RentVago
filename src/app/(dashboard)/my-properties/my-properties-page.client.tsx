"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

interface OwnerPropertyItem {
  id: string;
  title: string;
  description: string;
  location: string;
  price: string;
  type: string;
  rooms: number | null;
  images: string[];
  isFeatured: boolean;
  featuredUntil: string | null;
  status: "AVAILABLE" | "RENTED" | "DRAFT" | "PENDING_REVIEW";
  createdAt: string;
}

interface MyPropertiesPageClientProps {
  properties: OwnerPropertyItem[];
}

const currencyFormat = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

const statusLabelMap: Record<OwnerPropertyItem["status"], string> = {
  AVAILABLE: "Disponible",
  RENTED: "Arrendada",
  DRAFT: "Borrador",
  PENDING_REVIEW: "En revision",
};

const statusClassMap: Record<OwnerPropertyItem["status"], string> = {
  AVAILABLE: "border-green-500/40 bg-green-500/10 text-green-300",
  RENTED: "border-gray-700 bg-gray-800 text-gray-300",
  DRAFT: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  PENDING_REVIEW: "border-cyan-500/40 bg-cyan-500/10 text-cyan-300",
};

export function MyPropertiesPageClient({ properties }: MyPropertiesPageClientProps) {
  const [selectedForFeature, setSelectedForFeature] = useState<OwnerPropertyItem | null>(null);

  const sortedProperties = useMemo(() => {
    return [...properties].sort((left, right) => {
      if (left.isFeatured !== right.isFeatured) return left.isFeatured ? -1 : 1;
      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    });
  }, [properties]);

  if (sortedProperties.length === 0) {
    return (
      <div className="rounded-3xl border border-gray-800 bg-black px-4 py-12 text-center">
        <p className="text-base font-semibold text-white">Aun no tienes propiedades publicadas.</p>
        <p className="mt-2 text-sm text-gray-400">
          Crea tu primera propiedad y activa destaque premium cuando quieras acelerar su alcance.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {sortedProperties.map((property) => {
          const imageUrl = property.images[0] ?? "";

          return (
            <article
              key={property.id}
              className="overflow-hidden rounded-3xl border border-gray-800 bg-black shadow-[0_8px_30px_rgba(0,0,0,0.45)]"
            >
              <div className="relative h-44 bg-gray-900">
                {imageUrl ? (
                  <Image
                    src={imageUrl}
                    alt={property.title}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm font-semibold text-gray-600">
                    Sin imagen
                  </div>
                )}

                {property.isFeatured ? (
                  <span className="absolute left-3 top-3 rounded-full border border-yellow-400/40 bg-yellow-400/20 px-3 py-1 text-xs font-bold text-yellow-300">
                    Destacada
                  </span>
                ) : null}
              </div>

              <div className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="line-clamp-2 text-lg font-bold text-white">{property.title}</h2>
                  <span
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusClassMap[property.status]}`}
                  >
                    {statusLabelMap[property.status]}
                  </span>
                </div>

                <p className="line-clamp-1 text-sm text-gray-500">{property.location}</p>

                <p className="text-lg font-black text-green-400">
                  {currencyFormat.format(Number(property.price))}
                  <span className="ml-1 text-xs font-medium text-gray-500">/mes</span>
                </p>

                {property.featuredUntil ? (
                  <p className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-2.5 py-2 text-xs font-semibold text-yellow-200">
                    Destacada hasta {new Date(property.featuredUntil).toLocaleDateString("es-CO")}
                  </p>
                ) : null}

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setSelectedForFeature(property)}
                    className="flex-1 rounded-2xl border border-yellow-500/40 bg-linear-to-r from-yellow-500/20 to-amber-500/10 px-3 py-2 text-sm font-extrabold text-yellow-200 transition hover:border-yellow-300/70 hover:text-yellow-100"
                  >
                    ⭐ Destacar
                  </button>

                  <Link
                    href={`/checkout/${property.id}`}
                    className="flex-1 rounded-2xl border border-gray-700 bg-gray-900 px-3 py-2 text-center text-sm font-semibold text-gray-300 transition hover:border-green-500 hover:text-green-300"
                  >
                    Ir al checkout
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {selectedForFeature ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4">
          <div className="w-full max-w-lg rounded-3xl border border-yellow-400/40 bg-linear-to-b from-zinc-950 via-black to-zinc-950 p-6 shadow-[0_0_40px_rgba(234,179,8,0.2),0_0_70px_rgba(34,197,94,0.18)]">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-yellow-300">
              Premium RentVago
            </p>
            <h3 className="mt-2 text-2xl font-black text-white">Impulsa tu propiedad</h3>
            <p className="mt-3 text-sm leading-6 text-gray-300">
              Tu propiedad aparecera en la pagina de inicio y de primera en todas las busquedas.
            </p>

            <div className="mt-5 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-100">
              <p className="font-semibold">Beneficios del destaque:</p>
              <p className="mt-1">Mayor visibilidad durante 30 dias en listas, home y catalogo.</p>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setSelectedForFeature(null)}
                className="flex-1 rounded-2xl border border-gray-700 bg-gray-900 px-4 py-2.5 text-sm font-semibold text-gray-300 transition hover:border-gray-500 hover:text-white"
              >
                Cancelar
              </button>
              <Link
                href={`/checkout/${selectedForFeature.id}`}
                onClick={() => setSelectedForFeature(null)}
                className="flex-1 rounded-2xl bg-linear-to-r from-yellow-300 via-yellow-400 to-amber-400 px-4 py-2.5 text-center text-sm font-extrabold text-black transition hover:brightness-110"
              >
                Continuar al pago
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
