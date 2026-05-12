"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2, Play, Plus, Globe, Loader2 } from "lucide-react";
import { ScrapingPanel } from "./scraping-panel";

interface Fuente {
  id: string;
  nombre: string;
  city: string;
  activo: boolean;
  creadoEn: string;
}

interface RunResult {
  source: string;
  city: string;
  fetched: number;
  saved: number;
  error?: string;
}

interface RunApiResponse {
  sourceName: string;
  city: string;
  fetched: number;
  saved: number;
}

interface FuenteApi {
  id: string;
  nombre: string;
  url: string;
  activo: boolean;
  creadoEn: string;
}

const mapFuenteFromApi = (fuente: FuenteApi): Fuente => ({
  id: fuente.id,
  nombre: fuente.nombre,
  city: fuente.url,
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

    const body = {
      nombre: ((fd.get("nombre") as string).trim() || "Facebook").slice(0, 200),
      url: city,
      activo: true,
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
      toast.success(`Fuente Facebook agregada para ${city}.`);
      (e.target as HTMLFormElement).reset();
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
      body: JSON.stringify({ sourceName: "Facebook", city: fuente.city }),
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
      city: data.city,
      fetched: data.fetched,
      saved: data.saved,
    };
  };

  const handleRunSource = async (fuente: Fuente) => {
    setRunningSourceId(fuente.id);
    setRunError(null);
    try {
      const result = await runSingleSource(fuente);
      setRunResults((prev) => [result, ...(prev ?? [])]);
      toast.success(`Se sincronizaron ${result.saved} propiedades para ${result.city}.`);
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
      const results: RunResult[] = [];

      for (const source of activeSources) {
        try {
          const result = await runSingleSource(source);
          results.push(result);
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : "Error desconocido";
          results.push({
            source: source.nombre,
            city: source.city,
            fetched: 0,
            saved: 0,
            error: message,
          });
        }
      }

      setRunResults(results);

      const totalSaved = results.reduce((acc, item) => acc + item.saved, 0);
      const failed = results.filter((item) => item.error).length;

      toast.success(`Sincronización finalizada: ${totalSaved} propiedades guardadas.`);
      if (failed > 0) {
        toast.error(`${failed} fuente(s) presentaron error durante la ejecución.`);
      }

      router.refresh();
    } catch (err: unknown) {
      setRunError(err instanceof Error ? err.message : "Error inesperado.");
      toast.error(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setRunningAll(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <header>
        <h1 className="text-4xl font-black text-white tracking-tight mb-2">Scraper</h1>
        <p className="text-gray-400 font-medium">
          Gestión de fuentes y ejecución manual del scraper de Facebook Marketplace.
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
                  <p className="font-bold text-white text-sm">{fuente.nombre}</p>
                  <p className="text-gray-500 text-xs truncate mt-0.5">
                    Ciudad: {fuente.city}
                  </p>
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
          <input
            name="nombre"
            required
            defaultValue="Facebook"
            placeholder="Facebook"
            className="flex-1 rounded-2xl bg-gray-900 border border-gray-800 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
          />
          <input
            name="city"
            required
            placeholder="Ciudad a buscar (Ej: Medellin, Envigado)"
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
          Ejecuta el scraper en todas las fuentes activas o de forma individual. Este proceso
          puede tardar varios segundos por ciudad.
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
                <p className="font-bold">{r.source}</p>
                {r.error ? (
                  <p className="mt-1 text-xs">{r.error}</p>
                ) : (
                  <p className="mt-1 text-xs">
                    Ciudad: {r.city} · {r.saved} guardadas · {r.fetched} encontradas
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
