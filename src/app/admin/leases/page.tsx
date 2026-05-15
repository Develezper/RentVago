import { leaseUseCases } from "@/modules/admin/application/lease.use-cases";
import { AdminLeasesClient } from "./admin-leases-client";

export const dynamic = "force-dynamic";

export default async function AdminLeasesPage() {
  const raw = await leaseUseCases.getAllLeases();
  const leases = raw.map((l) => ({
    id: l.id,
    propertyId: l.propertyId,
    tenantId: l.tenantId,
    startDate: l.startDate.toISOString(),
    endDate: l.endDate.toISOString(),
    monthlyRent: l.monthlyRent.toString(),
    status: l.status as "ACTIVO" | "PENDIENTE" | "EXPIRADO",
    createdAt: l.createdAt.toISOString(),
    property: l.property,
    tenant: l.tenant,
  }));

  return <AdminLeasesClient leases={leases} />;
}
