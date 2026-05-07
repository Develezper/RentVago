import { scraperUseCases } from "@/modules/admin/application/scraper.use-cases";
import { AdminScraperClient } from "./admin-scraper-client";

export default async function AdminScraperPage() {
  const raw = await scraperUseCases.listScrapingSources();
  const fuentes = raw.map((f) => ({
    id: f.id,
    nombre: f.nombre,
    city: f.url,
    activo: f.activo,
    creadoEn: f.creadoEn.toISOString(),
  }));

  return <AdminScraperClient initialFuentes={fuentes} />;
}
