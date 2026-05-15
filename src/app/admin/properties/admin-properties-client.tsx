"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { Pencil, Trash2, Plus } from "lucide-react";

interface PropertyRow {
  id: string;
  title: string;
  location: string;
  price: string;
  type: "CASA" | "APARTAMENTO";
  rooms: number | null;
  isScraped: boolean;
  images: string[];
  owner: { id: string; name: string | null; email: string } | null;
}

export function AdminPropertiesClient({ properties }: { properties: PropertyRow[] }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta propiedad? Esta acción no se puede deshacer.")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/properties/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Error al eliminar");
      router.refresh();
    } catch {
      alert("No se pudo eliminar la propiedad.");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight mb-2">Propiedades</h1>
          <p className="text-gray-400 font-medium">Gestión completa del inventario de propiedades.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/properties/pending"
            className="flex items-center gap-2 border border-gray-800 bg-black text-gray-200 font-bold px-5 py-3 rounded-2xl hover:border-gray-700 hover:bg-green-500/5 transition-colors"
          >
            Pendientes
          </Link>
          <Link
            href="/admin/properties/new"
            className="flex items-center gap-2 bg-green-500 text-black font-extrabold px-5 py-3 rounded-2xl hover:bg-green-400 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Nueva propiedad
          </Link>
        </div>
      </header>

      <div className="bg-black rounded-2xl border border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-900 border-b border-gray-800">
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Título
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Ubicación
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Precio
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Propietario
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {properties.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No hay propiedades registradas.
                  </td>
                </tr>
              ) : (
                properties.map((p) => (
                  <tr key={p.id} className="hover:bg-green-500/5 transition-colors group">
                    <td className="px-6 py-4 font-semibold text-gray-200 max-w-xs">
                      <span className="line-clamp-1">{p.title}</span>
                    </td>
                    <td className="px-6 py-4 text-gray-200 max-w-xs">
                      <span className="line-clamp-1">{p.location}</span>
                    </td>
                    <td className="px-6 py-4 text-green-400 font-bold">
                      ${Number(p.price).toLocaleString("es-CO")}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold uppercase bg-gray-800 text-gray-300 px-3 py-1 rounded-lg">
                        {p.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-400 text-sm">
                      {p.owner?.name ?? p.owner?.email ?? (
                        <span className="italic text-gray-600">Sin propietario</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link
                          href={`/admin/properties/${p.id}/edit`}
                          className="flex items-center gap-1.5 text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500/20 hover:text-blue-200 px-3 py-2 rounded-lg transition-all"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Editar
                        </Link>
                        <button
                          onClick={() => handleDelete(p.id)}
                          disabled={deleting === p.id}
                          className="flex items-center gap-1.5 text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 hover:text-red-200 px-3 py-2 rounded-lg transition-all disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          {deleting === p.id ? "Eliminando..." : "Eliminar"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
