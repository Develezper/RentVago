"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";

interface LeaseData {
  id: string;
  propertyId: string;
  tenantId: string;
  startDate: string;
  endDate: string;
  monthlyRent: string;
  status: "ACTIVO" | "PENDIENTE" | "EXPIRADO";
}

interface SelectOption {
  id: string;
  name?: string | null;
  email?: string;
  title?: string;
  location?: string;
}

const inputCls =
  "w-full rounded-2xl bg-gray-900 border border-gray-800 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500";
const labelCls = "block text-sm font-bold text-gray-400 mb-1.5";

export function EditLeaseForm({
  lease,
  properties,
  users,
}: {
  lease: LeaseData;
  properties: SelectOption[];
  users: SelectOption[];
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const body = {
      propertyId: fd.get("propertyId") as string,
      tenantId: fd.get("tenantId") as string,
      startDate: fd.get("startDate") as string,
      endDate: fd.get("endDate") as string,
      monthlyRent: parseFloat(fd.get("monthlyRent") as string),
      status: fd.get("status") as string,
    };
    try {
      const res = await fetch(`/api/admin/leases/${lease.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data: unknown = await res.json();
        const msg =
          data && typeof data === "object" && "error" in data
            ? String((data as Record<string, unknown>).error)
            : "Error al actualizar el arriendo.";
        throw new Error(msg);
      }
      router.push("/admin/leases");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <Link
        href="/admin/leases"
        className="inline-flex items-center gap-2 text-gray-400 hover:text-green-400 mb-6 transition-colors font-medium"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver
      </Link>
      <h1 className="text-3xl font-black text-white tracking-tight mb-8">Editar Arriendo</h1>

      {error && (
        <div className="mb-6 bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-2xl text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className={labelCls}>Propiedad *</label>
          <select name="propertyId" required defaultValue={lease.propertyId} className={inputCls}>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title} — {p.location}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelCls}>Inquilino *</label>
          <select name="tenantId" required defaultValue={lease.tenantId} className={inputCls}>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name ?? "Sin nombre"} — {u.email}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Fecha de inicio *</label>
            <input
              name="startDate"
              type="date"
              required
              defaultValue={lease.startDate}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Fecha de fin *</label>
            <input
              name="endDate"
              type="date"
              required
              defaultValue={lease.endDate}
              className={inputCls}
            />
          </div>
        </div>

        <div>
          <label className={labelCls}>Renta mensual *</label>
          <input
            name="monthlyRent"
            type="number"
            min="1"
            step="any"
            required
            defaultValue={lease.monthlyRent}
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>Estado</label>
          <select name="status" defaultValue={lease.status} className={inputCls}>
            <option value="PENDIENTE">Pendiente</option>
            <option value="ACTIVO">Activo</option>
            <option value="EXPIRADO">Expirado</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-green-500 text-black font-extrabold py-4 rounded-2xl hover:bg-green-400 transition-colors disabled:opacity-50 text-lg"
        >
          {saving ? "Guardando..." : "Guardar Cambios"}
        </button>
      </form>
    </div>
  );
}
