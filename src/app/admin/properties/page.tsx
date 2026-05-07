import { adminService } from "@/services/admin.service";
import { AdminPropertiesClient } from "./admin-properties-client";

export default async function AdminPropertiesPage() {
  const raw = await adminService.getAllProperties();
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
