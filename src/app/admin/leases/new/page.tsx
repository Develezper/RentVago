import { adminService } from "@/services/admin.service";
import { prisma } from "@/lib/prisma";
import { NewLeaseForm } from "./new-lease-form";

export default async function NewLeasePage() {
  const [rawProperties, rawUsers] = await Promise.all([
    prisma.property.findMany({
      orderBy: { title: "asc" },
      select: { id: true, title: true, location: true },
    }),
    adminService.getAllUsers(),
  ]);

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

  return <NewLeaseForm properties={properties} users={users} />;
}
