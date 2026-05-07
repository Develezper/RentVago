"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type PropertyTypeOption = "CASA" | "APARTAMENTO";

interface FormState {
  title: string;
  description: string;
  city: string;
  type: PropertyTypeOption;
  price: string;
}

const initialFormState: FormState = {
  title: "",
  description: "",
  city: "",
  type: "APARTAMENTO",
  price: "",
};

const extractApiError = (payload: unknown): string => {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "error" in payload &&
    typeof payload.error === "string"
  ) {
    return payload.error;
  }

  return "No pudimos publicar tu inmueble. Intenta nuevamente.";
};

export function NewPropertyForm() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const isDisabled = useMemo(() => {
    return (
      isSubmitting ||
      form.title.trim().length === 0 ||
      form.city.trim().length === 0 ||
      form.price.trim().length === 0
    );
  }, [form.city, form.price, form.title, isSubmitting]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isDisabled) return;

    const parsedPrice = Number(form.price);
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      toast.error("El precio debe ser un número mayor que cero.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/properties/direct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim(),
          city: form.city.trim(),
          type: form.type,
          price: parsedPrice,
        }),
      });

      if (!response.ok) {
        const payload: unknown = await response.json();
        throw new Error(extractApiError(payload));
      }

      toast.success("Inmueble publicado y enviado a revisión.");
      router.push("/search");
      router.refresh();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Error de red al publicar.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="rounded-2xl border border-gray-800 bg-black p-6 sm:p-8">
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label htmlFor="title" className="text-sm font-semibold text-gray-300">
            Titulo
          </label>
          <input
            id="title"
            type="text"
            value={form.title}
            onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            className="w-full bg-gray-900 border border-gray-800 rounded-2xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Ej: Apartamento moderno con balcon"
            maxLength={200}
            required
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="description" className="text-sm font-semibold text-gray-300">
            Descripcion
          </label>
          <textarea
            id="description"
            value={form.description}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, description: event.target.value }))
            }
            className="w-full min-h-32 bg-gray-900 border border-gray-800 rounded-2xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Describe el inmueble, amenidades y estado general"
            maxLength={5000}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="city" className="text-sm font-semibold text-gray-300">
              Ciudad
            </label>
            <input
              id="city"
              type="text"
              value={form.city}
              onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value }))}
              className="w-full bg-gray-900 border border-gray-800 rounded-2xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Ej: Medellin"
              maxLength={120}
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="type" className="text-sm font-semibold text-gray-300">
              Tipo de inmueble
            </label>
            <select
              id="type"
              value={form.type}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, type: event.target.value as PropertyTypeOption }))
              }
              className="w-full bg-gray-900 border border-gray-800 rounded-2xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="CASA">Casa</option>
              <option value="APARTAMENTO">Apartamento</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="price" className="text-sm font-semibold text-gray-300">
            Precio mensual
          </label>
          <input
            id="price"
            type="number"
            min="1"
            step="0.01"
            value={form.price}
            onChange={(event) => setForm((prev) => ({ ...prev, price: event.target.value }))}
            className="w-full bg-gray-900 border border-gray-800 rounded-2xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Ej: 1800000"
            required
          />
        </div>
        <button
          type="submit"
          disabled={isDisabled}
          className="w-full sm:w-auto bg-green-500 text-black font-extrabold rounded-2xl hover:bg-green-400 px-6 py-3 transition-colors disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? "Publicando..." : "Publicar inmueble"}
        </button>
      </form>
    </section>
  );
}
