import { adminUseCases } from "@/modules/admin/application/admin.use-cases";
import { AdminUsersClient } from "./admin-users-client";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const raw = await adminUseCases.getAllUsers();
  const users = raw.map((u) => ({
    id: u.id,
    name: u.name ?? null,
    email: u.email,
    role: u.role as "EMPLOYEE" | "ADMIN",
    isActive: u.isActive,
    createdAt: u.createdAt.toISOString(),
  }));

  return <AdminUsersClient users={users} />;
}
