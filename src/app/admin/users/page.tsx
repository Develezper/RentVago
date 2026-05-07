import { adminService } from "@/services/admin.service";
import { AdminUsersClient } from "./admin-users-client";

export default async function AdminUsersPage() {
  const raw = await adminService.getAllUsers();
  const users = raw.map((u) => ({
    id: u.id,
    name: u.name ?? null,
    email: u.email,
    role: u.role as "USER" | "SUPERADMIN",
    isActive: u.isActive,
    createdAt: u.createdAt.toISOString(),
  }));

  return <AdminUsersClient users={users} />;
}
