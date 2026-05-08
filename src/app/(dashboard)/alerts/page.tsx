"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BellRing, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface AlertFilterItem {
  id: string;
  query: string | null;
  location: string | null;
  minPrice: string | null;
  maxPrice: string | null;
  rooms: number | null;
  createdAt: string;
}

const currencyFormat = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

const extractApiError = (payload: unknown, fallback: string): string => {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "error" in payload &&
    typeof payload.error === "string"
  ) {
    return payload.error;
  }

  return fallback;
};

const toPriceLabel = (value: string | null): string | null => {
  if (value === null) return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return value;
  return currencyFormat.format(numeric);
};

const getPriceRangeLabel = (alertFilter: AlertFilterItem): string => {
  const minPrice = toPriceLabel(alertFilter.minPrice);
  const maxPrice = toPriceLabel(alertFilter.maxPrice);

  if (!minPrice && !maxPrice) return "Cualquier precio";
  if (minPrice && maxPrice) return `${minPrice} - ${maxPrice}`;
  if (minPrice) return `Desde ${minPrice}`;
  return `Hasta ${maxPrice}`;
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertFilterItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    fetch("/api/search-filters", {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    })
      .then(async (response) => {
        const payload: unknown = await response.json();

        if (!isMounted) return;

        if (!response.ok) {
          toast.error(extractApiError(payload, "No fue posible cargar tus alertas."));
          setAlerts([]);
          return;
        }

        if (
          typeof payload === "object" &&
          payload !== null &&
          "data" in payload &&
          Array.isArray(payload.data)
        ) {
          setAlerts(payload.data as AlertFilterItem[]);
        } else {
          setAlerts([]);
        }
      })
      .catch(() => {
        if (!isMounted) return;
        toast.error("Error de red al cargar tus alertas.");
        setAlerts([]);
      })
      .finally(() => {
        if (!isMounted) return;
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const deleteAlert = useCallback(async (id: string) => {
    if (deletingId) return;

    setDeletingId(id);

    try {
      const response = await fetch(`/api/search-filters/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        const payload: unknown = await response.json();
        throw new Error(extractApiError(payload, "No fue posible eliminar la alerta."));
      }

      setAlerts((previous) => previous.filter((item) => item.id !== id));
      toast.success("Alerta eliminada correctamente.");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Error de red al eliminar la alerta.");
    } finally {
      setDeletingId(null);
    }
  }, [deletingId]);

  const alertsCount = useMemo(() => alerts.length, [alerts.length]);

  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-gray-800 bg-black p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-green-400">
          Notificaciones
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          Mis Alertas
        </h1>
        <p className="mt-2 text-sm text-gray-400">
          Gestiona tus búsquedas guardadas para no perder oportunidades de arriendo.
        </p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-gray-300">
          <BellRing className="h-4 w-4 text-green-400" />
          Alertas activas: <span className="font-bold text-white">{alertsCount}</span>
        </div>
      </header>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={`alert-skeleton-${index}`}
              className="h-36 animate-pulse rounded-2xl border border-gray-800 bg-black"
            />
          ))}
        </div>
      ) : null}

      {!isLoading && alerts.length === 0 ? (
        <div className="rounded-2xl border border-gray-800 bg-black px-4 py-10 text-center shadow-sm">
          <p className="text-base font-medium text-white">Aún no tienes alertas guardadas.</p>
          <p className="mt-1 text-sm text-gray-400">
            Ve a Buscar, ajusta filtros y activa una alerta para esta búsqueda.
          </p>
        </div>
      ) : null}

      {!isLoading && alerts.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {alerts.map((alertFilter) => (
            <article
              key={alertFilter.id}
              className="rounded-2xl border border-gray-800 bg-black p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-green-400">
                    Alerta activa
                  </p>
                  <h2 className="mt-2 text-base font-semibold text-white">
                    {alertFilter.query?.trim() || "Búsqueda sin texto"}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => deleteAlert(alertFilter.id)}
                  disabled={deletingId === alertFilter.id}
                  className="inline-flex h-9 items-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-3 text-sm font-semibold text-red-300 transition hover:bg-red-500/20 disabled:opacity-60"
                >
                  <Trash2 className="h-4 w-4" />
                  {deletingId === alertFilter.id ? "Eliminando..." : "Eliminar"}
                </button>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full border border-gray-700 bg-gray-900 px-2.5 py-1 text-gray-300">
                  Ciudad: {alertFilter.location ?? "Cualquiera"}
                </span>
                <span className="rounded-full border border-gray-700 bg-gray-900 px-2.5 py-1 text-gray-300">
                  Precio: {getPriceRangeLabel(alertFilter)}
                </span>
                <span className="rounded-full border border-gray-700 bg-gray-900 px-2.5 py-1 text-gray-300">
                  Habitaciones: {alertFilter.rooms ?? "Cualquiera"}
                </span>
              </div>

              <p className="mt-4 text-xs text-gray-500">
                Creada: {new Date(alertFilter.createdAt).toLocaleDateString("es-CO")}
              </p>
            </article>
          ))}
        </div>
      ) : null}
    </div>
  );
}
