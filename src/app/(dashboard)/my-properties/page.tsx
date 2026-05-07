import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { resolveAuthenticatedUserFromHeaders } from "@/lib/api-auth";
import { propertiesUseCases } from "@/modules/properties/application/property.use-cases";
import { MyPropertiesPageClient } from "./my-properties-page.client";

export default async function MyPropertiesPage() {
  const requestHeaders = await headers();
  const authenticatedUser = resolveAuthenticatedUserFromHeaders(requestHeaders);

  if (!authenticatedUser) {
    redirect("/login?next=/my-properties");
  }

  const properties = await propertiesUseCases.listOwnerProperties(authenticatedUser.userId);

  const serializedProperties = properties.map((property) => ({
    id: property.id,
    title: property.title,
    description: property.description,
    location: property.location,
    price: property.price.toString(),
    type: property.type,
    rooms: property.rooms,
    images: property.images,
    isFeatured: property.isFeatured,
    featuredUntil: property.featuredUntil?.toISOString() ?? null,
    status: property.status,
    createdAt: property.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-gray-800 bg-black p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-green-400">
              Gestion de propietario
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-white">Mis propiedades</h1>
            <p className="mt-2 text-sm text-gray-400">
              Administra tus publicaciones y destaca las mas importantes para ganar visibilidad.
            </p>
          </div>

          <Link
            href="/my-properties/new"
            className="rounded-2xl bg-green-500 px-5 py-3 text-sm font-extrabold text-black transition hover:bg-green-400"
          >
            + Publicar nueva propiedad
          </Link>
        </div>
      </section>

      <MyPropertiesPageClient properties={serializedProperties} />
    </div>
  );
}
