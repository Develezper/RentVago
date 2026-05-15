"use client";

import { CheckCircle2, ImageOff, Loader2, Play, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

const PLATFORMS = [
  { value: "FACEBOOK", label: "Facebook Marketplace" },
  { value: "MERCADOLIBRE", label: "MercadoLibre" },
  { value: "AIRBNB", label: "Airbnb" },
  { value: "BOOKING", label: "Booking.com" },
] as const;

type PlatformValue = (typeof PLATFORMS)[number]["value"];

type ScrapingFuente = {
  id: string;
  nombre: string;
  city: string;
  activo: boolean;
};

type PreviewProperty = {
  title: string;
  description: string;
  price: number;
  location: string;
  city?: string;
  neighborhood?: string;
  rooms?: number;
  imageUrls?: string[];
  imageUrl?: string;
  sourceUrl: string;
};

type ScraperRunResponse = {
  data: {
    platform: string;
    query: string;
    limit: number;
    preview: boolean;
    fetched: number;
    saved: number;
    discarded: number;
    properties: PreviewProperty[];
  };
};

type ScrapingPanelProps = {
  fuentes: ScrapingFuente[];
  onSaved?: () => void;
};

const minLimit = 1;
const maxLimit = 50;

const currencyFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

const clampLimit = (value: number): number => Math.min(maxLimit, Math.max(minLimit, value));

const getPreviewImage = (property: PreviewProperty): string | undefined =>
  property.imageUrls?.[0] ?? property.imageUrl;

const readErrorMessage = (payload: unknown): string => {
  if (payload && typeof payload === "object" && "error" in payload) {
    return String((payload as Record<string, unknown>).error);
  }
  return "No se pudo ejecutar el scraping.";
};

export function ScrapingPanel({ fuentes, onSaved }: ScrapingPanelProps) {
  const activeSources = useMemo(() => fuentes.filter((fuente) => fuente.activo), [fuentes]);
  const [platform, setPlatform] = useState<PlatformValue>("FACEBOOK");
  const [selectedCity, setSelectedCity] = useState(activeSources[0]?.city ?? "");
  const [limit, setLimit] = useState(10);
  const [preview, setPreview] = useState(true);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [properties, setProperties] = useState<PreviewProperty[]>([]);
  const [lastRun, setLastRun] = useState<{ query: string; platform: string; limit: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const executeScraper = async (mode: "preview" | "save") => {
    const query = selectedCity.trim();
    const normalizedLimit = clampLimit(limit);

    if (!query) {
      setError("Escribe una ciudad o búsqueda para ejecutar el scraper.");
      return null;
    }

    if (!Number.isInteger(limit) || limit < minLimit || limit > maxLimit) {
      setError(`La cantidad debe ser un entero entre ${minLimit} y ${maxLimit}.`);
      return null;
    }

    const isPreviewRun = mode === "preview";
    setError(null);
    if (isPreviewRun) {
      setLoading(true);
    } else {
      setSaving(true);
    }

    try {
      const shouldSaveCurrentPreview =
        !isPreviewRun &&
        preview &&
        properties.length > 0 &&
        lastRun?.query === query &&
        lastRun?.platform === platform &&
        lastRun.limit === normalizedLimit;
      const propertiesToSave = shouldSaveCurrentPreview ? properties : undefined;
      const response = await fetch("/api/scraper/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          query,
          limit: normalizedLimit,
          preview: isPreviewRun,
          properties: propertiesToSave,
        }),
      });
      const payload: unknown = await response.json();

      if (!response.ok) {
        throw new Error(readErrorMessage(payload));
      }

      const result = (payload as ScraperRunResponse).data;

      if (isPreviewRun) {
        setProperties(result.properties);
        setLastRun({ query: result.query, platform: result.platform, limit: result.limit });
        toast.success(`Preview listo: ${result.fetched} propiedades encontradas.`);
      } else {
        const discardedText =
          result.discarded > 0 ? ` ${result.discarded} descartadas por datos incompletos.` : "";
        toast.success(`Se guardaron ${result.saved} propiedades para ${result.query}.${discardedText}`);
        setProperties([]);
        setLastRun(null);
        onSaved?.();
      }

      return result;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error inesperado ejecutando scraper.";
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setLoading(false);
      setSaving(false);
    }
  };

  const handleLimitChange = (value: string) => {
    const parsed = Number.parseInt(value, 10);
    setLimit(Number.isFinite(parsed) ? clampLimit(parsed) : minLimit);
  };

  const canConfirm = preview && properties.length > 0 && lastRun !== null;

  return (
    <section className="rounded-2xl border border-gray-800 bg-black p-6 sm:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-green-400">
            Preview mode
          </p>
          <h2 className="mt-1 text-xl font-black text-white">Scraping dinámico</h2>
          <p className="mt-2 max-w-2xl text-sm font-medium text-gray-400">
            Trae propiedades en vivo desde la plataforma seleccionada, revisa el preview y confirma
            solo cuando quieras guardarlas.
          </p>
        </div>
        {lastRun ? (
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-xs font-bold text-green-300">
            <CheckCircle2 className="h-4 w-4" />
            {properties.length} en preview
          </span>
        ) : null}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1.2fr_0.55fr_0.8fr]">
        <label className="block">
          <span className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-gray-500">
            Plataforma
          </span>
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value as PlatformValue)}
            className="h-12 w-full rounded-2xl border border-gray-800 bg-gray-900 px-4 text-sm font-semibold text-white outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
          >
            {PLATFORMS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-gray-500">
            Ciudad / búsqueda
          </span>
          <input
            list="scraping-cities"
            value={selectedCity}
            onChange={(event) => setSelectedCity(event.target.value)}
            placeholder="Ej: Medellin, Envigado"
            className="h-12 w-full rounded-2xl border border-gray-800 bg-gray-900 px-4 text-sm font-semibold text-white outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
          />
          <datalist id="scraping-cities">
            {activeSources.map((fuente) => (
              <option key={fuente.id} value={fuente.city}>
                {fuente.nombre}
              </option>
            ))}
          </datalist>
        </label>

        <label className="block">
          <span className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-gray-500">
            Cantidad
          </span>
          <input
            type="number"
            min={minLimit}
            max={maxLimit}
            step={1}
            value={limit}
            onChange={(event) => handleLimitChange(event.target.value)}
            className="h-12 w-full rounded-2xl border border-gray-800 bg-gray-900 px-4 text-sm font-semibold text-white outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
          />
        </label>

        <div>
          <span className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-gray-500">
            Modo
          </span>
          <button
            type="button"
            aria-pressed={preview}
            onClick={() => setPreview((current) => !current)}
            className={`flex h-12 w-full items-center justify-between rounded-2xl border px-4 text-sm font-bold transition ${
              preview
                ? "border-green-500/40 bg-green-500/10 text-green-300"
                : "border-gray-800 bg-gray-900 text-gray-400"
            }`}
          >
            <span>{preview ? "Preview" : "Directo"}</span>
            <span
              className={`flex h-6 w-11 items-center rounded-full p-1 transition ${
                preview ? "bg-green-500" : "bg-gray-700"
              }`}
            >
              <span
                className={`h-4 w-4 rounded-full bg-zinc-900 transition ${
                  preview ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </span>
          </button>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => void executeScraper(preview ? "preview" : "save")}
          disabled={loading || saving}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-green-500 px-5 text-sm font-extrabold text-black transition hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading || saving ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : preview ? (
            <Search className="h-5 w-5" />
          ) : (
            <Play className="h-5 w-5" />
          )}
          {loading || saving ? "Scrapeando..." : "Iniciar Scraping"}
        </button>

        {canConfirm ? (
          <button
            type="button"
            onClick={() => void executeScraper("save")}
            disabled={saving || loading}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-green-500/40 bg-green-500/10 px-5 text-sm font-extrabold text-green-300 transition hover:bg-green-500/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
            Confirmar y Guardar
          </button>
        ) : null}
      </div>

      {error ? (
        <div className="mt-5 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300">
          {error}
        </div>
      ) : null}

      {preview && properties.length > 0 ? (
        <div className="mt-7">
          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-gray-500">
                Resultados en vivo
              </p>
              <h3 className="text-lg font-black text-white">
                Preview para {lastRun?.query} ({lastRun?.limit} solicitadas)
              </h3>
            </div>
            <p className="text-sm font-medium text-gray-400">
              Revisa antes de guardar en la base de datos.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {properties.map((property) => {
              const previewImage = getPreviewImage(property);

              return (
                <article
                  key={property.sourceUrl}
                  className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-950 shadow-[0_8px_30px_rgba(0,0,0,0.28)]"
                >
                  <div
                    className="flex aspect-video items-center justify-center bg-gray-900 bg-cover bg-center text-gray-500"
                    style={previewImage ? { backgroundImage: `url(${previewImage})` } : undefined}
                  >
                    {!previewImage ? <ImageOff className="h-8 w-8" /> : null}
                  </div>
                  <div className="space-y-2 p-4">
                    <h4 className="line-clamp-2 min-h-10 text-sm font-black text-white">
                      {property.title}
                    </h4>
                    <p className="text-lg font-black text-green-400">
                      {currencyFormatter.format(property.price)}
                    </p>
                    <p className="line-clamp-1 text-xs font-semibold text-gray-500">
                      {property.location}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      ) : null}
    </section>
  );
}
