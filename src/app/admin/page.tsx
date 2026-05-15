import { adminUseCases } from "@/modules/admin/application/admin.use-cases";
import DashboardCharts from "@/components/admin/DashboardCharts";
import Link from "next/link";
import {
  Home,
  Users,
  BarChart2,
  BellRing,
  TrendingUp,
  MapPin,
  MessageCircleMore,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const [stats, metrics, businessStats] = await Promise.all([
    adminUseCases.getStats(),
    adminUseCases.getDashboardMetrics(),
    adminUseCases.getBusinessStats(),
  ]);

  return (
    <div className="max-w-6xl mx-auto">
      <header className="mb-10">
        <h1 className="text-4xl font-black text-white tracking-tight mb-2">Resumen General</h1>
        <p className="text-gray-400 font-medium">
          Métricas clave del sistema RentVago en tiempo real.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6 mb-12">
        <Link
          href="/admin/properties"
          className="admin-metric-card bg-black p-8 rounded-2xl border border-gray-800 relative overflow-hidden group hover:border-gray-700 hover:bg-green-500/5 transition-colors block"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-gray-800 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity" />
          <div className="flex items-center gap-3 mb-4 relative z-10">
            <Home className="w-5 h-5 text-gray-500" />
            <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">
              Propiedades Totales
            </p>
          </div>
          <p className="admin-metric-value text-5xl font-black relative z-10">{stats.totalProperties}</p>
        </Link>

        <Link
          href="/admin/users"
          className="admin-metric-card bg-black p-8 rounded-2xl border border-gray-800 relative overflow-hidden group hover:border-green-500/30 hover:bg-green-500/5 transition-colors block"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-500 rounded-full blur-3xl opacity-10 group-hover:opacity-20 transition-opacity" />
          <div className="flex items-center gap-3 mb-4 relative z-10">
            <Users className="w-5 h-5 text-gray-500" />
            <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">
              Usuarios Activos
            </p>
          </div>
          <p className="admin-metric-value text-5xl font-black relative z-10">{stats.activeUsers}</p>
        </Link>

        <div className="admin-metric-card bg-black p-8 rounded-2xl border border-gray-800 relative overflow-hidden hover:bg-green-500/5 transition-colors">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gray-600 rounded-full blur-3xl opacity-20" />
          <div className="flex items-center gap-3 mb-4 relative z-10">
            <BarChart2 className="w-5 h-5 text-gray-500" />
            <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">
              Arriendos Activos
            </p>
          </div>
          <p className="admin-metric-value text-5xl font-black relative z-10">{stats.totalLeases}</p>
        </div>

        <div className="admin-metric-card bg-black p-8 rounded-2xl border border-gray-800 relative overflow-hidden hover:bg-green-500/5 transition-colors">
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-500 rounded-full blur-3xl opacity-10" />
          <div className="flex items-center gap-3 mb-4 relative z-10">
            <BellRing className="w-5 h-5 text-gray-500" />
            <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">
              Match Rate Mensual
            </p>
          </div>
          <p className="admin-metric-value text-5xl font-black relative z-10">
            {businessStats.matchRate.rate}%
          </p>
          <p className="mt-2 text-xs text-gray-400 relative z-10">
            {businessStats.matchRate.triggeredThisMonth} alertas disparadas / {" "}
            {businessStats.matchRate.activeAlerts} activas
          </p>
        </div>

        <div className="admin-metric-card bg-black p-8 rounded-2xl border border-gray-800 relative overflow-hidden hover:bg-green-500/5 transition-colors">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-400 rounded-full blur-3xl opacity-10" />
          <div className="flex items-center gap-3 mb-4 relative z-10">
            <MessageCircleMore className="w-5 h-5 text-gray-500" />
            <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">
              Leads Generados
            </p>
          </div>
          <p className="admin-metric-value text-5xl font-black relative z-10">{stats.totalLeads}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.14em]">
            Conversion Pipeline
          </p>
          <p className="mt-3 text-3xl font-black admin-metric-value">
            {businessStats.conversion.approvalRate}%
          </p>
          <p className="mt-2 text-sm text-gray-400">
            Aprobadas: <span className="font-bold">{businessStats.conversion.approved}</span>
          </p>
          <p className="text-sm text-gray-400">
            Rechazadas: <span className="font-bold">{businessStats.conversion.rejected}</span>
          </p>
          <p className="text-sm text-gray-500">
            Pendientes: <span className="font-bold">{businessStats.conversion.pending}</span>
          </p>
        </div>

        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-[0.14em]">
            <TrendingUp className="h-4 w-4" />
            Growth Rate
          </div>
          <p className="mt-3 text-3xl font-black admin-metric-value">{businessStats.growth.growthRate}%</p>
          <p className="mt-2 text-sm text-gray-400">
            Mes actual: <span className="font-bold">{businessStats.growth.currentMonth}</span>
          </p>
          <p className="text-sm text-gray-400">
            Mes anterior: <span className="font-bold">{businessStats.growth.previousMonth}</span>
          </p>
        </div>

        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-[0.14em]">
            <MapPin className="h-4 w-4" />
            Hot Zones
          </div>
          <div className="mt-4 space-y-2">
            {businessStats.hotZones.length === 0 ? (
              <p className="text-sm text-gray-400">Aun no hay busquedas guardadas con ubicacion.</p>
            ) : (
              businessStats.hotZones.map((zone, index) => (
                <div
                  key={`${zone.zone}-${index}`}
                  className="flex items-center justify-between rounded-xl border border-gray-800 bg-black/50 px-3 py-2"
                >
                  <span className="text-sm font-semibold text-gray-200">{zone.zone}</span>
                  <span className="text-sm font-bold text-green-400">{zone.searches}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <section className="mb-8 rounded-2xl border border-gray-800 bg-gray-900 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
            Propiedades por ciudad
          </h2>
          <span className="text-xs text-gray-400">Captacion geográfica</span>
        </div>

        {businessStats.propertiesByCity.length === 0 ? (
          <p className="text-sm text-gray-400">No hay datos de ciudades para mostrar.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-105 text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-left text-xs uppercase tracking-[0.12em] text-gray-500">
                  <th className="px-3 py-2 font-semibold">Ciudad</th>
                  <th className="px-3 py-2 font-semibold">Propiedades</th>
                </tr>
              </thead>
              <tbody>
                {businessStats.propertiesByCity.map((entry) => (
                  <tr key={entry.city} className="border-b border-gray-900/70">
                    <td className="px-3 py-2 font-semibold text-gray-200">{entry.city}</td>
                    <td className="px-3 py-2 font-bold text-green-400">{entry.properties}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mb-8 rounded-2xl border border-gray-800 bg-gray-900 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
            Propiedades calientes por leads
          </h2>
          <span className="text-xs text-gray-400">Clicks de contacto</span>
        </div>

        {businessStats.topLeadProperties.length === 0 ? (
          <p className="text-sm text-gray-400">Aun no se han generado leads.</p>
        ) : (
          <div className="space-y-2">
            {businessStats.topLeadProperties.map((entry) => (
              <div
                key={entry.propertyId}
                className="flex items-center justify-between rounded-xl border border-gray-800 bg-black/50 px-3 py-2"
              >
                <p className="truncate pr-4 text-sm font-medium text-gray-200">{entry.title}</p>
                <p className="text-sm font-bold text-green-400">{entry.leads} leads</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <DashboardCharts data={metrics} originData={businessStats.propertyOriginData} />
    </div>
  );
}
