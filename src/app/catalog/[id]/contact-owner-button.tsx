"use client";

import { MessageCircle } from "lucide-react";
import { useMemo, useState } from "react";

interface ContactOwnerButtonProps {
  propertyId: string;
  propertyTitle: string;
  whatsappNumber: string;
}

const extractErrorMessage = async (
  response: Response,
  fallback: string,
): Promise<string> => {
  try {
    const data: unknown = await response.json();
    if (
      typeof data === "object" &&
      data !== null &&
      "error" in data &&
      typeof data.error === "string"
    ) {
      return data.error;
    }
  } catch {
    return fallback;
  }

  return fallback;
};

export function ContactOwnerButton({
  propertyId,
  propertyTitle,
  whatsappNumber,
}: ContactOwnerButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const whatsappUrl = useMemo(() => {
    const normalizedNumber = whatsappNumber.replace(/\D/g, "");
    const encodedMessage = encodeURIComponent(
      `Hola, vi tu propiedad ${propertyTitle} en RentVago y estoy interesado. ¿Podemos hablar?`,
    );

    return `https://wa.me/${normalizedNumber}?text=${encodedMessage}`;
  }, [propertyTitle, whatsappNumber]);

  const handleContact = async () => {
    setErrorMessage(null);
    setIsLoading(true);

    const popup = window.open("about:blank", "_blank", "noopener,noreferrer");

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ propertyId }),
      });

      if (!response.ok) {
        const fallback = "No pudimos registrar tu contacto. Intenta de nuevo.";
        const resolvedError = await extractErrorMessage(response, fallback);
        throw new Error(resolvedError);
      }

      if (popup) {
        popup.location.href = whatsappUrl;
      } else {
        window.open(whatsappUrl, "_blank", "noopener,noreferrer");
      }
    } catch (error: unknown) {
      if (popup) {
        popup.close();
      }

      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("No pudimos registrar tu contacto. Intenta de nuevo.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full sm:w-auto">
      <button
        type="button"
        onClick={handleContact}
        disabled={isLoading}
        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-3 text-sm font-extrabold text-black transition-all hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto shadow-[0_0_18px_rgba(37,211,102,0.45)] hover:shadow-[0_0_30px_rgba(37,211,102,0.65)]"
        style={{ backgroundColor: "#25D366" }}
      >
        <MessageCircle className="h-5 w-5" />
        {isLoading ? "Conectando..." : "Contactar por WhatsApp"}
      </button>

      {errorMessage ? (
        <p className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
