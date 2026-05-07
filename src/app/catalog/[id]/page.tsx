import { propertiesUseCases } from "@/modules/properties/application/property.use-cases";
import { notFound } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import { ArrowLeft, MapPin, BedDouble, Tag } from "lucide-react";
import { PropertyImageCarousel } from "@/components/ui/property-image-carousel";
import { ACCESS_COOKIE_NAME } from "@/lib/auth-cookies";
import { verifyAccessToken } from "@/lib/jwt";
import { ContactOwnerButton } from "./contact-owner-button";

const DEFAULT_WHATSAPP_NUMBER = "3000000000";

const resolveAuthenticatedUserId = async (): Promise<string | null> => {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_COOKIE_NAME)?.value;

  if (!accessToken) {
    return null;
  }

  try {
    const payload = await verifyAccessToken(accessToken);
    return payload.sub;
  } catch {
    return null;
  }
};

const toDigitsOnly = (value: string | null | undefined): string => {
  return (value ?? "").replace(/\D/g, "");
};

const resolveWhatsappNumber = (ownerPhone: string | null | undefined): string => {
  const configuredValue = toDigitsOnly(process.env.NEXT_PUBLIC_RENTVAGO_WHATSAPP_NUMBER);

  if (configuredValue.length > 0) {
    return configuredValue;
  }

  const ownerPhoneValue = toDigitsOnly(ownerPhone);

  if (ownerPhoneValue.length > 0) {
    return ownerPhoneValue;
  }

  return DEFAULT_WHATSAPP_NUMBER;
};

export default async function CatalogPropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [property, userId] = await Promise.all([
    propertiesUseCases.getPublicPropertyById(id),
    resolveAuthenticatedUserId(),
  ]);

  if (!property) notFound();

  const hasContactableOwner = property.owner?.id != null;
  const whatsappNumber = resolveWhatsappNumber(property.owner?.phone);

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

        <div className="mb-8">
          <PropertyImageCarousel
            images={property.images}
            alt={property.title}
            showThumbnails={true}
            heightClassName="h-72 sm:h-96"
            badgeLabel="Catálogo RentVago"
          />
        </div>

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
            {userId === null ? (
              <>
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
              </>
            ) : hasContactableOwner ? (
              <>
                <p className="text-gray-500 text-sm mb-4">
                  Contacta por WhatsApp y registra este interés como lead para seguimiento.
                </p>
                <ContactOwnerButton
                  propertyId={property.id}
                  propertyTitle={property.title}
                  whatsappNumber={whatsappNumber}
                />
              </>
            ) : (
              <p className="text-amber-300 text-sm rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2">
                Esta propiedad no tiene un propietario disponible para contacto directo.
              </p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
