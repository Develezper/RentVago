import { leaseService } from "@/services/lease.service";
import { adminService } from "@/services/admin.service";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { EditLeaseForm } from "./edit-lease-form";

export default async function EditLeasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [lease, rawProperties, rawUsers] = await Promise.all([
    leaseService.getLeaseById(id),
    prisma.property.findMany({
      orderBy: { title: "asc" },
      select: { id: true, title: true, location: true },
    }),
    adminService.getAllUsers(),
  ]);

  if (!lease) notFound();

  const properties = rawProperties.map((p) => ({
    id: p.id,
    title: p.title,
    location: p.location,
  }));
  const users = rawUsers.map((u) => ({
    id: u.id,
    name: u.name ?? null,
    email: u.email,
  }));

  return (
    <EditLeaseForm
      lease={{
        id: lease.id,
        propertyId: lease.propertyId,
        tenantId: lease.tenantId,
        startDate: lease.startDate.toISOString().split("T")[0],
        endDate: lease.endDate.toISOString().split("T")[0],
        monthlyRent: lease.monthlyRent.toString(),
        status: lease.status as "ACTIVO" | "PENDIENTE" | "EXPIRADO",
      }}
      properties={properties}
      users={users}
    />
  );
}
