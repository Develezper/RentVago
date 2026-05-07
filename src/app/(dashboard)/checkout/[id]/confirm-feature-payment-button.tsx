"use client";

import { useState } from "react";
import Link from "next/link";

interface ConfirmFeaturePaymentButtonProps {
  propertyId: string;
}

export function ConfirmFeaturePaymentButton({
  propertyId,
}: ConfirmFeaturePaymentButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleConfirmPayment = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/properties/feature", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ propertyId }),
      });

      if (!response.ok) {
        const body: unknown = await response.json().catch(() => ({ error: "Error inesperado." }));
        const message =
          typeof body === "object" &&
          body !== null &&
          "error" in body &&
          typeof body.error === "string"
            ? body.error
            : "No pudimos procesar el pago simulado.";

        throw new Error(message);
      }

      setSuccessMessage("Pago confirmado. Tu propiedad ya fue destacada por 30 dias.");
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error ? error.message : "No pudimos confirmar el pago.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <button
        type="button"
        disabled={isLoading}
        onClick={handleConfirmPayment}
        className="w-full rounded-2xl bg-linear-to-r from-yellow-300 via-yellow-400 to-amber-400 px-5 py-3 text-sm font-extrabold text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isLoading ? "Procesando pago..." : "Confirmar Pago"}
      </button>

      {successMessage ? (
        <div className="rounded-2xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-300">
          <p>{successMessage}</p>
          <Link href="/my-properties" className="mt-2 inline-block font-semibold text-green-200">
            Volver a Mis Propiedades
          </Link>
        </div>
      ) : null}

      {errorMessage ? (
        <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
