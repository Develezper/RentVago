"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface UserRow {
  id: string;
  name: string | null;
  email: string;
  role: "EMPLOYEE" | "ADMIN";
  isActive: boolean;
  createdAt: string;
}

export function AdminUsersClient({ users }: { users: UserRow[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const updateUser = async (
    id: string,
    payload: { role?: "EMPLOYEE" | "ADMIN"; isActive?: boolean },
  ) => {
    setLoading(id);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Error al actualizar");
      router.refresh();
    } catch {
      alert("No se pudo actualizar el usuario.");
    } finally {
      setLoading(null);
    }
  };

  const toggleRole = (user: UserRow) => {
    const newRole = user.role === "ADMIN" ? "EMPLOYEE" : "ADMIN";
    updateUser(user.id, { role: newRole });
  };

  const toggleStatus = (user: UserRow) => {
    updateUser(user.id, { isActive: !user.isActive });
  };

  return (
    <div className="max-w-6xl mx-auto">
      <header className="mb-10">
        <h1 className="text-4xl font-black text-white tracking-tight mb-2">
          Directorio de Usuarios
        </h1>
        <p className="text-gray-400 font-medium">
          Control total sobre roles y accesos a la plataforma.
        </p>
      </header>

      <div className="bg-black rounded-2xl border border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-900 border-b border-gray-800">
                <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Nombre
                </th>
                <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Rol
                </th>
                <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-900/50 transition-colors group">
                  <td className="px-8 py-6 font-semibold text-white">
                    {user.name ?? (
                      <span className="text-gray-600 italic font-normal">Sin nombre</span>
                    )}
                  </td>
                  <td className="px-8 py-6 text-gray-400 font-medium">{user.email}</td>
                  <td className="px-8 py-6">
                    <span
                      className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider border ${
                        user.role === "ADMIN"
                          ? "bg-green-500/10 text-green-400 border-green-500/30"
                          : "bg-gray-800 text-gray-300 border-gray-700"
                      }`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          user.isActive
                            ? "bg-green-500 shadow-[0_0_8px_#22c55e]"
                            : "bg-gray-600"
                        }`}
                      />
                      <span
                        className={`text-sm font-bold ${
                          user.isActive ? "text-gray-200" : "text-gray-500"
                        }`}
                      >
                        {user.isActive ? "ACTIVO" : "SUSPENDIDO"}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => toggleRole(user)}
                        disabled={loading === user.id}
                        className="text-xs font-bold uppercase tracking-wider bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white px-4 py-2 rounded-lg transition-all border border-gray-700 disabled:opacity-50"
                      >
                        {loading === user.id ? "..." : "Cambiar rol"}
                      </button>
                      <button
                        onClick={() => toggleStatus(user)}
                        disabled={loading === user.id}
                        className={`text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-lg transition-all border disabled:opacity-50 ${
                          user.isActive
                            ? "bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500 hover:text-white hover:border-red-500"
                            : "bg-green-500/10 text-green-400 border-green-500/30 hover:bg-green-500 hover:text-white hover:border-green-500"
                        }`}
                      >
                        {loading === user.id
                          ? "..."
                          : user.isActive
                            ? "Suspender"
                            : "Activar"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
