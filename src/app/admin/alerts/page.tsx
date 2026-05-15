import { adminUseCases } from "@/modules/admin/application/admin.use-cases";

export const dynamic = "force-dynamic";

const statusLabels: Record<string, string> = {
  PENDING: "Pendiente",
  CONTACTED: "Contactado",
  CLOSED: "Cerrado",
};

const statusClasses: Record<string, string> = {
  PENDING: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  CONTACTED: "border-sky-500/30 bg-sky-500/10 text-sky-300",
  CLOSED: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
};

const dateFormatter = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "medium",
  timeStyle: "short",
});

export default async function AdminMatchAlertsPage() {
  const alerts = await adminUseCases.getAllMatchAlerts();

  return (
    <div className="max-w-6xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-black text-white tracking-tight">Alertas de Match</h1>
        <p className="mt-2 text-sm text-gray-400">
          Prospectos capturados por la IA para seguimiento comercial.
        </p>
      </header>

      <section className="rounded-2xl border border-gray-800 bg-black">
        <div className="flex items-center justify-between border-b border-gray-800 px-5 py-4">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-500">
            Total de alertas
          </p>
          <p className="text-sm font-bold text-green-400">{alerts.length}</p>
        </div>

        {alerts.length === 0 ? (
          <div className="px-5 py-8 text-sm text-gray-500">No hay alertas registradas por ahora.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-225 text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-left text-xs uppercase tracking-[0.12em] text-gray-500">
                  <th className="px-5 py-3 font-semibold">Nombre</th>
                  <th className="px-5 py-3 font-semibold">Telefono</th>
                  <th className="px-5 py-3 font-semibold">Criterio</th>
                  <th className="px-5 py-3 font-semibold">Fecha</th>
                  <th className="px-5 py-3 font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((alert) => {
                  const status = alert.status.toUpperCase();
                  const statusLabel = statusLabels[status] ?? alert.status;
                  const badgeClass =
                    statusClasses[status] ?? "border-gray-700 bg-gray-800/50 text-gray-300";

                  return (
                    <tr key={alert.id} className="border-b border-gray-900/70 align-top">
                      <td className="px-5 py-4 font-semibold text-gray-100">{alert.name}</td>
                      <td className="px-5 py-4 text-gray-300">{alert.phone}</td>
                      <td className="max-w-md px-5 py-4 text-gray-300">{alert.criteria}</td>
                      <td className="whitespace-nowrap px-5 py-4 text-gray-400">
                        {dateFormatter.format(alert.createdAt)}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.08em] ${badgeClass}`}
                        >
                          {statusLabel}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
