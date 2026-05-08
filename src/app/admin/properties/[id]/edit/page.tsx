import { propertiesUseCases } from "@/modules/properties/application/property.use-cases";
import { notFound } from "next/navigation";
import { EditPropertyForm } from "./edit-property-form";

export default async function EditPropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const property = await propertiesUseCases.getPropertyById(id);

  if (!property) notFound();

  return (
    <EditPropertyForm
      property={{
        ...property,
        price: property.price.toString(),
        rooms: property.rooms ?? null,
        type: property.type as "CASA" | "APARTAMENTO",
      }}
    />
  );
}
