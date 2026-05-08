import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { FavoriteButton } from "@/components/ui/favorite-button";
import { resolveAuthenticatedUserFromHeaders } from "@/lib/api-auth";
import { resolveActiveCityByInput } from "@/modules/properties/domain/geography";
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

const DEFAULT_WHATSAPP_NUMBER = "3000000000";

const toDigitsOnly = (value: string | null | undefined): string => {
  return (value ?? "").replace(/\D/g, "");
};

const resolveWhatsappNumber = (ownerPhone: string | null | undefined): string => {
  const configured = toDigitsOnly(process.env.NEXT_PUBLIC_RENTVAGO_WHATSAPP_NUMBER);
  if (configured.length > 0) return configured;

  const ownerValue = toDigitsOnly(ownerPhone);
  if (ownerValue.length > 0) return ownerValue;

  return DEFAULT_WHATSAPP_NUMBER;
};

const getAuthenticatedUserId = async (): Promise<string | null> => {
  const requestHeaders = await headers();
  return resolveAuthenticatedUserFromHeaders(requestHeaders)?.userId ?? null;
};

const normalizeLocationPart = (value: string): string => {
  return value.replace(/\s+/g, " ").replace(/^[,.:;\-]+|[,.:;\-]+$/g, "").trim();
};

const extractNeighborhoodFromTitle = (title: string): string | null => {
  const explicitPattern =
    /\b(?:barrio|sector|urbanizaci[oó]n)\s+([a-zA-ZÀ-ÿ0-9][a-zA-ZÀ-ÿ0-9\s\-]{1,80})/i;
  const explicitMatch = title.match(explicitPattern);
  if (explicitMatch?.[1]) {
    const candidate = normalizeLocationPart(explicitMatch[1].split(/[\n\r,;\.]/)[0] ?? "");
    return candidate.length > 1 ? candidate : null;
  }

  const trailingPattern =
    /\ben\s+(?!.*\ben\s+)([a-zA-ZÀ-ÿ0-9][a-zA-ZÀ-ÿ0-9\s\-]{1,80})$/i;
  const trailingMatch = title.match(trailingPattern);
  if (!trailingMatch?.[1]) {
    return null;
  }

  const candidate = normalizeLocationPart(trailingMatch[1].split(/[\n\r,;\.]/)[0] ?? "");
  if (candidate.length < 2) {
    return null;
  }

  const invalidStarts = [
    "arriendo",
    "arrendando",
    "venta",
    "vendo",
    "alquiler",
    "apartamento",
    "casa",
    "habitacion",
    "habitaciones",
    "unidad",
    "conjunto",
  ];
  const lowered = candidate
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  if (invalidStarts.some((token) => lowered === token || lowered.startsWith(`${token} `))) {
    return null;
  }

  return candidate;
};

const isNeighborhoodValid = (neighborhood: string, city: string): boolean => {
  const normalize = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

  if (neighborhood.length === 0) {
    return false;
  }

  const normalizedNeighborhood = normalize(neighborhood);
  const normalizedCity = normalize(city);

  if (normalizedCity.length > 0 && normalizedNeighborhood === normalizedCity) {
    return false;
  }

  return true;
};

const extractBathroomsFromText = (text: string): number | null => {
  const patterns = [
    /\b(\d{1,2})\s*(?:ba(?:n|ñ)os?|wc|sanitarios?)\b/i,
    /\b(?:ba(?:n|ñ)os?|wc|sanitarios?)\s*[:\-]?\s*(\d{1,2})\b/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match?.[1]) {
      continue;
    }

    const parsed = Number.parseInt(match[1], 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return null;
};

const extractAreaFromText = (text: string): number | null => {
  const patterns = [
    /\b(\d{2,4})\s*(?:m2|m²|mt2|mts2|metros?\s*cuadrados?)\b/i,
    /\b(?:area|metraje)\s*[:\-]?\s*(\d{2,4})\b/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match?.[1]) {
      continue;
    }

    const parsed = Number.parseInt(match[1], 10);
    if (Number.isFinite(parsed) && parsed >= 10 && parsed <= 2000) {
      return parsed;
    }
  }

  return null;
};

const resolveDisplayLocation = (property: {
  title: string;
  location: string;
  city: string | null;
  neighborhood: string | null;
}): string => {
  const city = (property.city ?? "").trim();
  const rawStoredNeighborhood = (property.neighborhood ?? "").trim();
  const storedNeighborhood = isNeighborhoodValid(rawStoredNeighborhood, city)
    ? rawStoredNeighborhood
    : null;
  const titleNeighborhood = extractNeighborhoodFromTitle(property.title);
  const neighborhood = storedNeighborhood ?? titleNeighborhood;

  if (neighborhood && city.length > 0) {
    return `${neighborhood}, ${city}`;
  }

  if (neighborhood) {
    return neighborhood;
  }

  return property.location;
};

export default async function PropertyDetailPage({ params }: PropertyDetailPageProps) {
  const { id } = await params;
  const matchedCity = resolveActiveCityByInput(id);
  if (matchedCity) {
    redirect(`/search?city=${matchedCity.slug}`);
  }

  const property = await propertiesUseCases.getPropertyById(id);
  const userId = await getAuthenticatedUserId();
  const isFavorite =
    userId !== null ? await favoritesUseCases.isPropertyFavorite(userId, id) : false;

  if (!property) {
    notFound();
  }

  const monthlyPrice = currencyFormat.format(Number(property.price));
  const rooms = property.rooms ?? 0;
  const searchableText = `${property.title}\n${property.description}`;
  const bathrooms = extractBathroomsFromText(searchableText);
  const area = extractAreaFromText(searchableText);
  const displayLocation = resolveDisplayLocation(property);
  const whatsappText = encodeURIComponent(
    `Hola, me interesa la propiedad "${property.title}" (${displayLocation}).`,
  );
  const ownerPhoneDigits = toDigitsOnly(property.owner?.phone);
  const shouldUseFacebookFallback =
    property.isScraped &&
    ownerPhoneDigits.length === 0 &&
    (property.sourceUrl ?? "").trim().length > 0;
  const whatsappNumber = resolveWhatsappNumber(property.owner?.phone);
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${whatsappText}`;
  const contactUrl = shouldUseFacebookFallback ? (property.sourceUrl ?? "") : whatsappUrl;
  const contactLabel = shouldUseFacebookFallback
    ? "Contactar en Facebook"
    : "Contactar por WhatsApp";
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
            <p className="text-sm font-medium text-gray-500">{displayLocation}</p>
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
              className="h-72 rounded-3xl bg-linear-to-br from-green-900/20 via-gray-800 to-gray-900 bg-cover bg-center sm:h-96"
              style={{
                backgroundImage: primaryImage
                  ? `linear-gradient(to top, rgba(0,0,0,0.5), rgba(0,0,0,0.1)), url(${primaryImage})`
                  : undefined,
              }}
            />
            <div className="grid gap-3 sm:grid-rows-2">
              <div
                className="h-36 rounded-2xl bg-linear-to-br from-gray-800 via-gray-800 to-gray-900 bg-cover bg-center sm:h-auto"
                style={{
                  backgroundImage: secondaryImage
                    ? `linear-gradient(to top, rgba(0,0,0,0.4), rgba(0,0,0,0.1)), url(${secondaryImage})`
                    : undefined,
                }}
              />
              <div
                className="h-36 rounded-2xl bg-linear-to-br from-gray-900 via-gray-800 to-gray-900 bg-cover bg-center sm:h-auto"
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
              <p className="mt-1 text-xl font-semibold text-white">{bathrooms ?? "N/D"}</p>
            </div>
            <div className="rounded-2xl border border-gray-800 bg-black p-4 shadow-sm">
              <p className="text-xs uppercase tracking-[0.14em] text-gray-500">Area</p>
              <p className="mt-1 text-xl font-semibold text-white">
                {area !== null ? `${area} m²` : "N/D"}
              </p>
            </div>
            <div className="rounded-2xl border border-gray-800 bg-black p-4 shadow-sm">
              <p className="text-xs uppercase tracking-[0.14em] text-gray-500">Ubicacion</p>
              <p className="mt-1 text-base font-semibold text-white">{displayLocation}</p>
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
            href={contactUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-2xl bg-green-500 px-4 text-sm font-extrabold text-black transition hover:bg-green-400 shadow-[0_0_15px_rgba(34,197,94,0.3)] hover:shadow-[0_0_25px_rgba(34,197,94,0.5)]"
          >
            {contactLabel}
          </a>
        </aside>
      </div>
    </div>
  );
}
