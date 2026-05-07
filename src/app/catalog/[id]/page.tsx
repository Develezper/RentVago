import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, MapPin, BedDouble, Tag } from "lucide-react";

export default async function CatalogPropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const property = await prisma.property.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      description: true,
      images: true,
      price: true,
      location: true,
      rooms: true,
      type: true,
      createdAt: true,
      owner: { select: { name: true } },
    },
  });

  if (!property) notFound();

  const mainImage = property.images[0] ?? "";
  const gallery = property.images.slice(1, 5);

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <Link
          href="/catalog"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al catálogo
        </Link>

        <div className="relative h-72 sm:h-96 rounded-2xl overflow-hidden bg-gray-900 mb-6">
          {mainImage ? (
            <Image
              src={mainImage}
              alt={property.title}
              fill
              className="object-cover"
              unoptimized
              priority
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-700 text-6xl">🏠</div>
          )}
        </div>

        {gallery.length > 0 && (
          <div className="grid grid-cols-4 gap-3 mb-8">
            {gallery.map((img, i) => (
              <div key={i} className="relative h-20 rounded-xl overflow-hidden bg-gray-900">
                <Image
                  src={img}
                  alt={`${property.title} ${i + 2}`}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
            ))}
          </div>
        )}

        <div className="bg-black rounded-2xl border border-gray-800 p-8">
          <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
            <h1 className="text-3xl font-black text-white">{property.title}</h1>
            <span className="text-xs font-bold uppercase bg-gray-800 text-gray-400 px-3 py-1.5 rounded-lg">
              {property.type}
            </span>
          </div>

          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <MapPin className="w-4 h-4 text-green-500 shrink-0" />
              {property.location}
            </div>
            {property.rooms != null && (
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <BedDouble className="w-4 h-4 text-green-500 shrink-0" />
                {property.rooms} habitación{property.rooms !== 1 ? "es" : ""}
              </div>
            )}
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <Tag className="w-4 h-4 text-green-500 shrink-0" />
              Publicado el{" "}
              {property.createdAt.toLocaleDateString("es-CO", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </div>
          </div>

          <p className="text-green-400 font-black text-4xl mb-6">
            ${Number(property.price).toLocaleString("es-CO")}
            <span className="text-gray-500 font-normal text-base"> /mes</span>
          </p>

          {property.description && (
            <div className="mb-8">
              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">
                Descripción
              </h2>
              <p className="text-gray-300 leading-relaxed whitespace-pre-line">
                {property.description}
              </p>
            </div>
          )}

          <div className="pt-6 border-t border-gray-800">
            <p className="text-gray-500 text-sm mb-4">
              Inicia sesión para contactar al propietario y guardar esta propiedad en tus
              favoritos.
            </p>
            <div className="flex gap-3 flex-wrap">
              <Link
                href="/login"
                className="bg-green-500 text-black font-extrabold px-6 py-3 rounded-2xl hover:bg-green-400 transition-colors"
              >
                Iniciar sesión
              </Link>
              <Link
                href="/register"
                className="border border-gray-700 text-gray-300 font-semibold px-6 py-3 rounded-2xl hover:border-green-500 hover:text-green-400 transition-colors"
              >
                Crear cuenta
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
