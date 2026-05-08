import { propertiesUseCases } from "@/modules/properties/application/property.use-cases";
import { PendingPropertiesClient } from "./pending-properties-client";

export default async function PendingAdminPropertiesPage() {
  const allProperties = await propertiesUseCases.listAdminProperties();
  const pendingProperties = allProperties
    .filter((property) => property.status === "PENDING_REVIEW")
    .map((property) => ({
      id: property.id,
      title: property.title,
      location: property.location,
      type: property.type as "CASA" | "APARTAMENTO",
      price: property.price.toString(),
      createdAt: property.createdAt.toISOString(),
      owner: property.owner
        ? {
            name: property.owner.name,
            email: property.owner.email,
          }
        : null,
    }));

  return <PendingPropertiesClient initialProperties={pendingProperties} />;
}
