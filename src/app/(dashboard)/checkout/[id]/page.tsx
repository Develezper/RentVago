import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { resolveAuthenticatedUserFromHeaders } from "@/lib/api-auth";
import { createFeatureCheckoutToken } from "@/modules/properties/application/feature-checkout-token";
import { propertiesUseCases } from "@/modules/properties/application/property.use-cases";
import { FEATURED_PROPERTY_PRICE_COP } from "@/modules/properties/domain/feature.constants";
import { ConfirmFeaturePaymentButton } from "./confirm-feature-payment-button";

interface CheckoutPageProps {
  params: Promise<{ id: string }>;
}

const currencyFormat = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

export default async function CheckoutPage({ params }: CheckoutPageProps) {
  const requestHeaders = await headers();
  const authenticatedUser = resolveAuthenticatedUserFromHeaders(requestHeaders);

  if (!authenticatedUser) {
    redirect("/login");
  }

  const { id } = await params;
  const property = await propertiesUseCases.getPropertyById(id);

  if (!property || property.ownerId !== authenticatedUser.userId) {
    notFound();
  }

  const checkoutToken = await createFeatureCheckoutToken({
    propertyId: property.id,
    ownerId: authenticatedUser.userId,
    amount: FEATURED_PROPERTY_PRICE_COP,
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/my-properties"
        className="inline-flex items-center rounded-xl border border-gray-700 bg-gray-900 px-4 py-2 text-sm font-semibold text-gray-300 transition hover:border-gray-600 hover:text-white"
      >
        Volver a Mis Propiedades
      </Link>

      <section className="rounded-3xl border border-yellow-400/40 bg-linear-to-b from-zinc-950 via-black to-zinc-950 p-6 shadow-[0_0_40px_rgba(234,179,8,0.2),0_0_60px_rgba(34,197,94,0.18)] sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-yellow-300">
          Checkout Premium
        </p>
        <h1 className="mt-2 text-3xl font-black text-white">Destaca tu propiedad</h1>
        <p className="mt-3 text-sm text-gray-300">
          Activa visibilidad prioritaria por 30 dias para mejorar conversion y velocidad de cierre.
        </p>

        <div className="mt-6 rounded-2xl border border-gray-800 bg-black/60 p-4">
          <p className="text-sm font-semibold text-white">{property.title}</p>
          <p className="mt-1 text-sm text-gray-400">{property.location}</p>
          <p className="mt-3 text-lg font-black text-yellow-300">
            {currencyFormat.format(FEATURED_PROPERTY_PRICE_COP)}
          </p>
        </div>

        <div className="mt-6 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-100">
          Tu propiedad aparecera en la pagina de inicio y de primera en todas las busquedas.
        </div>

        <div className="mt-6">
          <ConfirmFeaturePaymentButton propertyId={property.id} checkoutToken={checkoutToken} />
        </div>
      </section>
    </div>
  );
}
