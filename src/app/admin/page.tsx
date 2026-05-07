import { adminUseCases } from "@/modules/admin/application/admin.use-cases";
import DashboardCharts from "@/components/admin/DashboardCharts";
import Link from "next/link";
import { Home, Users, BarChart2 } from "lucide-react";

export default async function AdminPage() {
  const [stats, metrics] = await Promise.all([
    adminUseCases.getStats(),
    adminUseCases.getDashboardMetrics(),
  ]);

  return (
    <div className="max-w-6xl mx-auto">
      <header className="mb-10">
        <h1 className="text-4xl font-black text-white tracking-tight mb-2">Resumen General</h1>
        <p className="text-gray-400 font-medium">
          Métricas clave del sistema RentVago en tiempo real.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <Link
          href="/admin/properties"
          className="bg-black p-8 rounded-2xl border border-gray-800 relative overflow-hidden group hover:border-gray-700 transition-colors block"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-gray-800 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity" />
          <div className="flex items-center gap-3 mb-4 relative z-10">
            <Home className="w-5 h-5 text-gray-500" />
            <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">
              Propiedades Totales
            </p>
          </div>
          <p className="text-5xl font-black text-white relative z-10">{stats.totalProperties}</p>
        </Link>

        <Link
          href="/admin/users"
          className="bg-black p-8 rounded-2xl border border-gray-800 relative overflow-hidden group hover:border-green-500/30 transition-colors block"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-500 rounded-full blur-3xl opacity-10 group-hover:opacity-20 transition-opacity" />
          <div className="flex items-center gap-3 mb-4 relative z-10">
            <Users className="w-5 h-5 text-gray-500" />
            <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">
              Usuarios Activos
            </p>
          </div>
          <p className="text-5xl font-black text-green-400 relative z-10">{stats.activeUsers}</p>
        </Link>

        <div className="bg-black p-8 rounded-2xl border border-gray-800 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gray-600 rounded-full blur-3xl opacity-20" />
          <div className="flex items-center gap-3 mb-4 relative z-10">
            <BarChart2 className="w-5 h-5 text-gray-500" />
            <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">
              Arriendos Activos
            </p>
          </div>
          <p className="text-5xl font-black text-gray-300 relative z-10">{stats.totalLeases}</p>
        </div>
      </div>

      <DashboardCharts data={metrics} />
    </div>
  );
}
