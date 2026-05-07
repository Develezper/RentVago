import { prisma } from "@/lib/prisma";
import { AdminScraperClient } from "./admin-scraper-client";

export default async function AdminScraperPage() {
  const raw = await prisma.scrapingFuente.findMany({ orderBy: { creadoEn: "desc" } });
  const fuentes = raw.map((f) => ({
    id: f.id,
    nombre: f.nombre,
    url: f.url,
    activo: f.activo,
    creadoEn: f.creadoEn.toISOString(),
  }));

  return <AdminScraperClient initialFuentes={fuentes} />;
}
