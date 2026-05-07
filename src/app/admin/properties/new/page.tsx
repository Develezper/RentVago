"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const inputCls =
  "w-full rounded-2xl bg-gray-900 border border-gray-800 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500";
const labelCls = "block text-sm font-bold text-gray-400 mb-1.5";

export default function NewPropertyPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);

    const fd = new FormData(e.currentTarget);
    const imagesRaw = (fd.get("images") as string).trim();
    const images = imagesRaw.length > 0
      ? imagesRaw.split(",").map((u) => u.trim()).filter(Boolean)
      : [];

    const priceRaw = fd.get("price") as string;
    const roomsRaw = fd.get("rooms") as string;
    const ownerIdRaw = fd.get("ownerId") as string;

    const body = {
      title: fd.get("title") as string,
      description: (fd.get("description") as string).trim(),
      location: fd.get("location") as string,
      price: parseFloat(priceRaw),
      rooms: roomsRaw.trim().length > 0 ? parseInt(roomsRaw, 10) : undefined,
      type: fd.get("type") as string,
      images,
      ownerId: ownerIdRaw.trim().length > 0 ? ownerIdRaw : undefined,
    };

    try {
      const res = await fetch("/api/admin/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data: unknown = await res.json();
        const msg =
          data && typeof data === "object" && "error" in data
            ? String((data as Record<string, unknown>).error)
            : "Error al crear la propiedad.";
        throw new Error(msg);
      }
      toast.success("Propiedad creada correctamente.");
      router.push("/admin/properties");
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <Link
        href="/admin/properties"
        className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors font-medium"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver
      </Link>
      <h1 className="text-3xl font-black text-white tracking-tight mb-8">Nueva Propiedad</h1>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className={labelCls}>Título *</label>
          <input name="title" required placeholder="Ej: Apartamento 201 Centro" className={inputCls} />
        </div>

        <div>
          <label className={labelCls}>Ubicación *</label>
          <input name="location" required placeholder="Ej: Medellín, Antioquia" className={inputCls} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Precio mensual *</label>
            <input
              name="price"
              type="number"
              min="1"
              step="any"
              required
              placeholder="1500000"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Habitaciones</label>
            <input
              name="rooms"
              type="number"
              min="1"
              max="50"
              placeholder="2"
              className={inputCls}
            />
          </div>
        </div>

        <div>
          <label className={labelCls}>Tipo</label>
          <select name="type" className={inputCls}>
            <option value="APARTAMENTO">Apartamento</option>
            <option value="CASA">Casa</option>
          </select>
        </div>

        <div>
          <label className={labelCls}>Imágenes (URLs separadas por coma)</label>
          <input name="images" placeholder="https://... , https://..." className={inputCls} />
        </div>

        <div>
          <label className={labelCls}>ID del propietario (UUID, opcional)</label>
          <input
            name="ownerId"
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>Descripción</label>
          <textarea
            name="description"
            rows={3}
            placeholder="Descripción de la propiedad..."
            className={`${inputCls} resize-none`}
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-green-500 text-black font-extrabold py-4 rounded-2xl hover:bg-green-400 transition-colors disabled:opacity-50 text-lg"
        >
          {saving ? "Guardando..." : "Crear Propiedad"}
        </button>
      </form>
    </div>
  );
}
