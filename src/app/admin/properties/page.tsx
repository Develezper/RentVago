import { propertiesUseCases } from "@/modules/properties/application/property.use-cases";
import { AdminPropertiesClient } from "./admin-properties-client";

export const dynamic = "force-dynamic";

export default async function AdminPropertiesPage() {
  const raw = await propertiesUseCases.listAdminProperties();
  const properties = raw.map((p) => ({
    id: p.id,
    title: p.title,
    location: p.location,
    price: p.price.toString(),
    type: p.type as "CASA" | "APARTAMENTO",
    rooms: p.rooms ?? null,
    isScraped: p.isScraped,
    images: p.images,
    owner: p.owner
      ? { id: p.owner.id, name: p.owner.name ?? null, email: p.owner.email }
      : null,
  }));

  return <AdminPropertiesClient properties={properties} />;
}
