"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { Pencil, Trash2, Plus } from "lucide-react";

interface LeaseRow {
  id: string;
  propertyId: string;
  tenantId: string;
  startDate: string;
  endDate: string;
  monthlyRent: string;
  status: "ACTIVO" | "PENDIENTE" | "EXPIRADO";
  createdAt: string;
  property: { id: string; title: string; location: string };
  tenant: { id: string; name: string | null; email: string };
}

const STATUS_STYLES: Record<string, string> = {
  ACTIVO: "bg-green-500/10 text-green-400 border-green-500/30",
  PENDIENTE: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  EXPIRADO: "bg-gray-800 text-gray-500 border-gray-700",
};

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });

export function AdminLeasesClient({ leases }: { leases: LeaseRow[] }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este arriendo? Esta acción no se puede deshacer.")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/leases/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Error al eliminar");
      router.refresh();
    } catch {
      alert("No se pudo eliminar el arriendo.");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight mb-2">Arriendos</h1>
          <p className="text-gray-400 font-medium">
            Gestión de contratos de arrendamiento activos y pendientes.
          </p>
        </div>
        <Link
          href="/admin/leases/new"
          className="flex items-center gap-2 bg-green-500 text-black font-extrabold px-5 py-3 rounded-2xl hover:bg-green-400 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nuevo arriendo
        </Link>
      </header>

      <div className="bg-black rounded-2xl border border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-900 border-b border-gray-800">
                {["Propiedad", "Inquilino", "Inicio", "Fin", "Renta mensual", "Estado", ""].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {leases.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No hay arriendos registrados.
                  </td>
                </tr>
              ) : (
                leases.map((l) => (
                  <tr key={l.id} className="hover:bg-green-500/5 transition-colors group">
                    <td className="px-6 py-4 max-w-xs">
                      <p className="font-semibold text-gray-200 line-clamp-1">{l.property.title}</p>
                      <p className="text-gray-500 text-xs mt-0.5 line-clamp-1">
                        {l.property.location}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-gray-300 text-sm">
                      {l.tenant.name ?? l.tenant.email}
                    </td>
                    <td className="px-6 py-4 text-gray-400 text-sm">{fmt(l.startDate)}</td>
                    <td className="px-6 py-4 text-gray-400 text-sm">{fmt(l.endDate)}</td>
                    <td className="px-6 py-4 text-green-400 font-bold">
                      ${Number(l.monthlyRent).toLocaleString("es-CO")}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`text-xs font-bold uppercase px-3 py-1.5 rounded-lg border ${STATUS_STYLES[l.status] ?? ""}`}
                      >
                        {l.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link
                          href={`/admin/leases/${l.id}/edit`}
                          className="flex items-center gap-1.5 text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500/20 hover:text-blue-200 px-3 py-2 rounded-lg transition-all"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Editar
                        </Link>
                        <button
                          onClick={() => handleDelete(l.id)}
                          disabled={deleting === l.id}
                          className="flex items-center gap-1.5 text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 hover:text-red-200 px-3 py-2 rounded-lg transition-all disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          {deleting === l.id ? "..." : "Eliminar"}
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
