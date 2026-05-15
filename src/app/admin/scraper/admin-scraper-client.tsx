"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2, Play, Plus, Globe, Loader2 } from "lucide-react";
import { ScrapingPanel } from "./scraping-panel";

const PLATFORMS = [
  { value: "FACEBOOK", label: "Facebook Marketplace" },
  { value: "MERCADOLIBRE", label: "MercadoLibre" },
  { value: "AIRBNB", label: "Airbnb" },
  { value: "BOOKING", label: "Booking.com" },
] as const;

type PlatformValue = (typeof PLATFORMS)[number]["value"];

const PLATFORM_LABELS: Record<string, string> = {
  FACEBOOK: "Facebook",
  MERCADOLIBRE: "MercadoLibre",
  AIRBNB: "Airbnb",
  BOOKING: "Booking.com",
};

interface Fuente {
  id: string;
  nombre: string;
  city: string;
  plataforma: string;
  activo: boolean;
  creadoEn: string;
}

interface RunResult {
  source: string;
  platform?: string;
  query?: string;
  fetched?: number;
  saved: number;
  discarded?: number;
  error?: string;
}

interface RunAllApiResponse {
  data: {
    sources: number;
    totalSaved: number;
    totalDiscarded: number;
    results: Array<{
      source: string;
      platform: string;
      saved: number;
      discarded: number;
      error?: string;
    }>;
  };
}

interface RunApiResponse {
  platform: string;
  query: string;
  fetched: number;
  saved: number;
  discarded: number;
}

interface FuenteApi {
  id: string;
  nombre: string;
  url: string;
  activo: boolean;
  plataforma: string;
  creadoEn: string;
}

const mapFuenteFromApi = (fuente: FuenteApi): Fuente => ({
  id: fuente.id,
  nombre: fuente.nombre,
  city: fuente.url,
  plataforma: fuente.plataforma,
  activo: fuente.activo,
  creadoEn: fuente.creadoEn,
});

export function AdminScraperClient({ initialFuentes }: { initialFuentes: Fuente[] }) {
  const router = useRouter();
  const [fuentes, setFuentes] = useState(initialFuentes);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [runningAll, setRunningAll] = useState(false);
  const [runningSourceId, setRunningSourceId] = useState<string | null>(null);
  const [runResults, setRunResults] = useState<RunResult[] | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const [addingLoading, setAddingLoading] = useState(false);
  const [newPlatform, setNewPlatform] = useState<PlatformValue>("FACEBOOK");

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta fuente?")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/scraper/fuentes/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Error al eliminar");
      setFuentes((prev) => prev.filter((f) => f.id !== id));
    } catch {
      alert("No se pudo eliminar la fuente.");
    } finally {
      setDeleting(null);
    }
  };

  const handleToggle = async (fuente: Fuente) => {
    try {
      const res = await fetch(`/api/scraper/fuentes/${fuente.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo: !fuente.activo }),
      });
      if (!res.ok) throw new Error();
      setFuentes((prev) =>
        prev.map((f) => (f.id === fuente.id ? { ...f, activo: !fuente.activo } : f)),
      );
    } catch {
      alert("No se pudo actualizar la fuente.");
    }
  };

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAddError(null);
    setAddingLoading(true);
    const fd = new FormData(e.currentTarget);
    const city = (fd.get("city") as string).trim();
    const platformLabel = PLATFORMS.find((p) => p.value === newPlatform)?.label ?? newPlatform;

    const body = {
      nombre: `${platformLabel} · ${city}`.slice(0, 200),
      url: city,
      activo: true,
      plataforma: newPlatform,
    };

    try {
      const res = await fetch("/api/scraper/fuentes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json: unknown = await res.json();
      if (!res.ok) {
        const msg =
          json && typeof json === "object" && "error" in json
            ? String((json as Record<string, unknown>).error)
            : "Error al agregar la fuente.";
        throw new Error(msg);
      }
      router.refresh();
      const created = (json as { data: FuenteApi }).data;
      setFuentes((prev) => [mapFuenteFromApi(created), ...prev]);
      toast.success(`Fuente ${platformLabel} agregada para ${city}.`);
      (e.target as HTMLFormElement).reset();
      setNewPlatform("FACEBOOK");
    } catch (err: unknown) {
      setAddError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setAddingLoading(false);
    }
  };

  const runSingleSource = async (fuente: Fuente): Promise<RunResult> => {
    const res = await fetch("/api/scraper/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        platform: fuente.plataforma,
        query: fuente.city,
        limit: 10,
        preview: false,
      }),
    });
    const json: unknown = await res.json();
    if (!res.ok) {
      const msg =
        json && typeof json === "object" && "error" in json
          ? String((json as Record<string, unknown>).error)
          : "Error al ejecutar el scraper.";
      throw new Error(msg);
    }

    const data = (json as { data: RunApiResponse }).data;
    return {
      source: fuente.nombre,
      platform: data.platform,
      query: data.query,
      fetched: data.fetched,
      saved: data.saved,
      discarded: data.discarded,
    };
  };

  const handleRunSource = async (fuente: Fuente) => {
    setRunningSourceId(fuente.id);
    setRunError(null);
    try {
      const result = await runSingleSource(fuente);
      setRunResults((prev) => [result, ...(prev ?? [])]);
      toast.success(`Se sincronizaron ${result.saved} propiedades para ${result.query}.`);
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error inesperado.";
      setRunError(message);
      toast.error(message);
    } finally {
      setRunningSourceId(null);
    }
  };

  const handleRunAll = async () => {
    const activeSources = fuentes.filter((source) => source.activo);
    if (activeSources.length === 0) {
      toast.error("No hay fuentes activas para ejecutar.");
      return;
    }

    setRunningAll(true);
    setRunResults(null);
    setRunError(null);

    try {
      const res = await fetch("/api/scraper/run-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const json: unknown = await res.json();
      if (!res.ok) {
        const msg =
          json && typeof json === "object" && "error" in json
            ? String((json as Record<string, unknown>).error)
            : "Error al ejecutar el scraper.";
        throw new Error(msg);
      }

      const data = (json as RunAllApiResponse).data;
      const results: RunResult[] = data.results.map((r) => ({
        source: r.source,
        platform: r.platform,
        saved: r.saved,
        discarded: r.discarded,
        error: r.error,
      }));

      setRunResults(results);
      const failed = results.filter((r) => r.error).length;
      toast.success(`Sincronización finalizada: ${data.totalSaved} propiedades guardadas.`);
      if (failed > 0) toast.error(`${failed} fuente(s) presentaron error.`);
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error inesperado.";
      setRunError(message);
      toast.error(message);
    } finally {
      setRunningAll(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <header>
        <h1 className="text-4xl font-black text-white tracking-tight mb-2">Scraper</h1>
        <p className="text-gray-400 font-medium">
          Gestión de fuentes y ejecución manual del scraper multi-plataforma.
        </p>
      </header>

      <ScrapingPanel fuentes={fuentes} onSaved={() => router.refresh()} />

      <div className="bg-black rounded-2xl border border-gray-800 p-8">
        <h2 className="text-lg font-black text-white mb-6 flex items-center gap-2">
          <Globe className="w-5 h-5 text-green-500" />
          Fuentes de scraping
        </h2>

        {fuentes.length === 0 ? (
          <p className="text-gray-500 text-sm italic py-4">No hay fuentes configuradas.</p>
        ) : (
          <div className="space-y-3 mb-6">
            {fuentes.map((fuente) => (
              <div
                key={fuente.id}
                className="flex items-center justify-between gap-4 bg-gray-900 rounded-xl p-4 border border-gray-800"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-bold text-white text-sm">{fuente.nombre}</p>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 border border-gray-700">
                      {PLATFORM_LABELS[fuente.plataforma] ?? fuente.plataforma}
                    </span>
                  </div>
                  <p className="text-gray-500 text-xs truncate">Búsqueda: {fuente.city}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={() => handleRunSource(fuente)}
                    disabled={runningAll || runningSourceId !== null}
                    className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg bg-green-500 text-black hover:bg-green-400 transition-colors disabled:opacity-50"
                  >
                    {runningSourceId === fuente.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Play className="w-3.5 h-3.5" />
                    )}
                    {runningSourceId === fuente.id ? "Scrapeando..." : "Ejecutar"}
                  </button>
                  <button
                    onClick={() => handleToggle(fuente)}
                    className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all ${
                      fuente.activo
                        ? "bg-green-500/10 text-green-400 border-green-500/30"
                        : "bg-gray-800 text-gray-500 border-gray-700"
                    }`}
                  >
                    {fuente.activo ? "ACTIVO" : "INACTIVO"}
                  </button>
                  <button
                    onClick={() => handleDelete(fuente.id)}
                    disabled={deleting === fuente.id}
                    className="text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {addError && (
          <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm">
            {addError}
          </div>
        )}

        <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-3">
          <select
            value={newPlatform}
            onChange={(e) => setNewPlatform(e.target.value as PlatformValue)}
            className="flex-1 rounded-2xl bg-gray-900 border border-gray-800 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-green-500 text-sm font-semibold"
          >
            {PLATFORMS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          <input
            name="city"
            required
            placeholder="Ciudad o búsqueda (Ej: Medellin)"
            className="flex-1 rounded-2xl bg-gray-900 border border-gray-800 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
          />
          <button
            type="submit"
            disabled={addingLoading}
            className="flex items-center gap-2 bg-green-500 text-black font-extrabold px-5 py-3 rounded-2xl hover:bg-green-400 transition-colors disabled:opacity-50 shrink-0"
          >
            <Plus className="w-4 h-4" />
            {addingLoading ? "Agregando..." : "Agregar"}
          </button>
        </form>
      </div>

      <div className="bg-black rounded-2xl border border-gray-800 p-8">
        <h2 className="text-lg font-black text-white mb-2">Ejecutar scraper</h2>
        <p className="text-gray-500 text-sm mb-6">
          Ejecuta todas las fuentes activas en paralelo. Este proceso puede tardar varios minutos.
        </p>

        <button
          onClick={handleRunAll}
          disabled={runningAll || runningSourceId !== null}
          className="flex items-center gap-2 bg-green-500 text-black font-extrabold px-6 py-3 rounded-2xl hover:bg-green-400 transition-colors disabled:opacity-50"
        >
          {runningAll ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Play className="w-5 h-5" />
          )}
          {runningAll ? "Scrapeando..." : "Ejecutar todas las fuentes"}
        </button>

        {runError && (
          <div className="mt-6 bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-2xl text-sm">
            {runError}
          </div>
        )}

        {runResults !== null && (
          <div className="mt-6 space-y-3">
            <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Resultados</p>
            {runResults.map((r, i) => (
              <div
                key={i}
                className={`p-4 rounded-xl border text-sm ${
                  r.error
                    ? "bg-red-500/10 border-red-500/30 text-red-400"
                    : "bg-green-500/10 border-green-500/30 text-green-300"
                }`}
              >
                <div className="flex items-center gap-2">
                  <p className="font-bold">{r.source}</p>
                  {r.platform && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-black/30 border border-white/10">
                      {PLATFORM_LABELS[r.platform] ?? r.platform}
                    </span>
                  )}
                </div>
                {r.error ? (
                  <p className="mt-1 text-xs">{r.error}</p>
                ) : (
                  <p className="mt-1 text-xs">
                    {r.query ? `Búsqueda: ${r.query} · ` : ""}
                    {r.fetched !== undefined ? `${r.fetched} encontradas · ` : ""}
                    {r.saved} guardadas
                    {r.discarded ? ` · ${r.discarded} descartadas` : ""}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
