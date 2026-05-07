import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { EditPropertyForm } from "./edit-property-form";

export default async function EditPropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const property = await prisma.property.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      description: true,
      location: true,
      price: true,
      rooms: true,
      type: true,
      images: true,
      ownerId: true,
    },
  });

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
