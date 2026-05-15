"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";

interface PendingPropertyItem {
  id: string;
  title: string;
  location: string;
  type: "CASA" | "APARTAMENTO";
  price: string;
  createdAt: string;
  owner: { name: string | null; email: string } | null;
}

interface PendingPropertiesClientProps {
  initialProperties: PendingPropertyItem[];
}

const toCurrency = (value: string): string => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return value;
  return numeric.toLocaleString("es-CO");
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

  return "No se pudo aprobar la propiedad.";
};

export function PendingPropertiesClient({ initialProperties }: PendingPropertiesClientProps) {
  const [items, setItems] = useState<PendingPropertyItem[]>(initialProperties);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const pendingCount = useMemo(() => items.length, [items.length]);

  const handleApprove = async (id: string) => {
    if (approvingId) return;

    setApprovingId(id);

    try {
      const response = await fetch(`/api/admin/properties/${id}/approve`, {
        method: "PATCH",
        credentials: "include",
      });

      if (!response.ok) {
        const payload: unknown = await response.json();
        throw new Error(extractApiError(payload));
      }

      setItems((previous) => previous.filter((property) => property.id !== id));
      toast.success("Publicación aprobada correctamente.");
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Error de red al aprobar la propiedad.",
      );
    } finally {
      setApprovingId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <header className="flex flex-col gap-4 rounded-2xl border border-gray-800 bg-black p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-green-400">
            Revision editorial
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-white">
            Publicaciones pendientes
          </h1>
          <p className="mt-2 text-sm text-gray-400">
            Aprueba los inmuebles enviados por propietarios para publicarlos en el catalogo.
          </p>
        </div>
        <div className="rounded-2xl border border-gray-800 bg-gray-900 px-4 py-3 text-sm text-gray-300">
          Pendientes: <span className="font-bold text-white">{pendingCount}</span>
        </div>
      </header>

      <div className="rounded-2xl border border-gray-800 bg-black overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-900 border-b border-gray-800">
                <th className="px-5 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Inmueble
                </th>
                <th className="px-5 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Ubicacion
                </th>
                <th className="px-5 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Precio
                </th>
                <th className="px-5 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Propietario
                </th>
                <th className="px-5 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">
                  Accion
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-gray-500">
                    No hay publicaciones pendientes por aprobar.
                  </td>
                </tr>
              ) : (
                items.map((property) => (
                  <tr key={property.id} className="hover:bg-green-500/5 transition-colors">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-gray-200">{property.title}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {property.type} • {new Date(property.createdAt).toLocaleDateString("es-CO")}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-gray-200">
                      {property.location}
                    </td>
                    <td className="px-5 py-4 text-green-400 font-bold">
                      ${toCurrency(property.price)}
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-400">
                      {property.owner?.name ?? property.owner?.email ?? "Sin propietario"}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => handleApprove(property.id)}
                        disabled={approvingId === property.id}
                        className="bg-green-500 text-black font-extrabold rounded-2xl hover:bg-green-400 px-4 py-2 text-sm transition-colors disabled:opacity-70"
                      >
                        {approvingId === property.id ? "Aprobando..." : "Aprobar Publicacion"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Link
        href="/admin/properties"
        className="inline-flex rounded-2xl border border-gray-800 bg-black px-4 py-2 text-sm font-semibold text-gray-300 transition-colors hover:text-gray-200 hover:border-gray-700 hover:bg-green-500/5"
      >
        Volver al listado general
      </Link>
    </div>
  );
}
