import Link from "next/link";
import { cookies, headers } from "next/headers";
import { unstable_cache } from "next/cache";
import { ArrowRight, LogIn, Sparkles } from "lucide-react";
import { AIChat } from "@/components/ui/ai-chat";
import { PropertyCard } from "@/components/ui/property-card";
import { WelcomeCityToast } from "@/components/ui/welcome-city-toast";
import { ACCESS_COOKIE_NAME } from "@/lib/auth-cookies";
import { verifyAccessToken } from "@/lib/jwt";
import { propertiesUseCases } from "@/modules/properties/application/property.use-cases";
import {
  getCityBySlug,
  resolveActiveCityByInput,
} from "@/modules/properties/domain/geography";

const CITY_COOKIE_NAME = "rentvago_selected_city";
const DEFAULT_CITY_SLUG = "medellin";

const getCachedRecommendations = unstable_cache(
  async (userId: string | null, preferredCity: string) => {
    return propertiesUseCases.getRecommendedProperties({
      userId,
      preferredCity,
      limit: 8,
    });
  },
  ["homepage-recommended-properties"],
  { revalidate: 300, tags: ["homepage-recommended-properties"] },
);

const resolveAuthenticatedUserId = async (): Promise<string | null> => {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_COOKIE_NAME)?.value;
  if (!accessToken) return null;

  try {
    const payload = await verifyAccessToken(accessToken);
    return payload.sub;
  } catch {
    return null;
  }
};

const resolvePreferredCity = async (): Promise<{ slug: string; name: string }> => {
  const cookieStore = await cookies();
  const cookieCity = cookieStore.get(CITY_COOKIE_NAME)?.value;
  const fromCookie = cookieCity ? resolveActiveCityByInput(cookieCity) : null;
  if (fromCookie) {
    return { slug: fromCookie.slug, name: fromCookie.name };
  }

  const requestHeaders = await headers();
  const ipCityCandidate =
    requestHeaders.get("x-vercel-ip-city") ??
    requestHeaders.get("x-geo-city") ??
    requestHeaders.get("x-city");
  const fromIp = ipCityCandidate ? resolveActiveCityByInput(ipCityCandidate) : null;
  if (fromIp) {
    return { slug: fromIp.slug, name: fromIp.name };
  }

  const fallback = getCityBySlug(DEFAULT_CITY_SLUG);
  return { slug: DEFAULT_CITY_SLUG, name: fallback?.name ?? "Medellin" };
};

export default async function HomePage() {
  const [preferredCity, userId] = await Promise.all([
    resolvePreferredCity(),
    resolveAuthenticatedUserId(),
  ]);

  const recommendations = await getCachedRecommendations(userId, preferredCity.slug);
  const resolvedRecommendationCity = resolveActiveCityByInput(recommendations.city);
  const welcomeCitySlug = resolvedRecommendationCity?.slug ?? preferredCity.slug;
  const welcomeCityName = recommendations.city || preferredCity.name;

  return (
    <main className="relative isolation overflow-hidden bg-gray-950 text-white">
      <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80 pointer-events-none">
        <div className="relative left-[calc(50%-11rem)] aspect-1155/678 w-144.5 -translate-x-1/2 rotate-30 bg-linear-to-tr from-green-500 to-black opacity-20 sm:left-[calc(50%-30rem)] sm:w-288.75" />
      </div>

      <section className="relative z-10 mx-auto flex min-h-[68vh] w-full max-w-5xl items-center px-6 pb-10 pt-14 text-center lg:px-8">
        <div className="mx-auto w-full py-16">
          <div className="mb-8 flex justify-center">
            <span className="flex items-center gap-2 rounded-full border border-green-500/20 bg-green-500/10 px-4 py-1.5 text-sm font-bold tracking-wide text-green-400">
              <Sparkles className="h-4 w-4" />
              La revolucion del arrendamiento
            </span>
          </div>

          <h1 className="mb-6 text-5xl font-black tracking-tight text-white sm:text-7xl">
            Gestiona tus alquileres con{" "}
            <span className="text-green-400">
              RentVago
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-xl font-medium leading-8 text-gray-400">
            La plataforma definitiva para conectar arrendadores y arrendatarios con seguridad
            de grado empresarial.
          </p>

          <div className="mt-12 flex flex-col items-center justify-center gap-6 sm:flex-row">
            <Link
              href="/register"
              className="group flex items-center gap-2 rounded-full bg-green-500 px-8 py-4 text-lg font-bold text-black shadow-[0_0_20px_rgba(233,82,22,0.32)] transition-all hover:bg-green-400 hover:shadow-[0_0_30px_rgba(233,82,22,0.48)] active:scale-95"
            >
              Empezar gratis
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/login"
              className="group flex items-center gap-2 rounded-full border border-green-500/40 bg-green-500/10 px-8 py-4 text-lg font-bold text-green-300 shadow-[0_0_18px_rgba(233,82,22,0.12)] transition-all hover:border-green-400 hover:bg-green-500/20 hover:text-green-200 active:scale-95"
            >
              Iniciar sesion
              <LogIn className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/catalog"
              className="border-b-2 border-transparent pb-1 text-lg font-bold leading-6 text-gray-300 transition-colors hover:border-white hover:text-white"
            >
              Ver propiedades →
            </Link>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto w-full max-w-7xl px-6 pb-16 lg:px-8">
        <WelcomeCityToast
          cityName={welcomeCityName}
          citySlug={welcomeCitySlug}
          todayNewOffers={recommendations.todayNewOffers}
        />

        <div className="rounded-3xl border border-gray-800 bg-black/70 p-6 backdrop-blur">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-green-400">
                Recomendados para ti
              </p>
              <h2 className="mt-1 text-2xl font-bold text-white sm:text-3xl">
                Propiedades recomendadas segun tu ubicacion
              </h2>
              <p className="mt-2 text-sm text-gray-400">
                Priorizamos opciones en {welcomeCityName} para que encuentres algo ideal mas
                rapido.
              </p>
            </div>
            <Link
              href={`/catalog?city=${encodeURIComponent(welcomeCitySlug)}`}
              className="inline-flex h-10 items-center rounded-xl border border-green-500/40 bg-green-500/10 px-4 text-sm font-bold text-green-300 transition hover:bg-green-500/20"
            >
              Explorar sede
            </Link>
          </div>

          {recommendations.items.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-gray-800 bg-gray-950 px-4 py-8 text-center text-sm text-gray-400">
              Aun no hay propiedades recomendadas para esta sede. Prueba explorar el catalogo
              completo.
            </div>
          ) : (
            <div className="mt-6 flex snap-x gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {recommendations.items.map((property, index) => (
                <div
                  key={property.id}
                  className={`snap-start ${
                    index === 0
                      ? "min-w-[320px] flex-none sm:min-w-105"
                      : "min-w-75 flex-none sm:min-w-85"
                  }`}
                >
                  <PropertyCard property={property} className="h-full" />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <AIChat />

    </main>
  );
}
