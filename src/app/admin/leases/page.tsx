import { leaseService } from "@/services/lease.service";
import { AdminLeasesClient } from "./admin-leases-client";

export default async function AdminLeasesPage() {
  const raw = await leaseService.getAllLeases();
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
