import { prisma } from "@/lib/prisma";
import type { Role } from "@/generated/prisma/enums";
import { LeaseStatus } from "@/generated/prisma/enums";

export const adminService = {
  async getStats() {
    const [totalUsers, totalProperties, totalLeases] = await Promise.all([
      prisma.user.count({ where: { isActive: true } }),
      prisma.property.count(),
      prisma.lease.count({ where: { status: LeaseStatus.ACTIVO } }),
    ]);
    return { activeUsers: totalUsers, totalProperties, totalLeases };
  },

  async getDashboardMetrics() {
    const [propertyTypes, userTrend, leaseStatus] = await Promise.all([
      prisma.property.groupBy({ by: ["type"], _count: true }),
      prisma.user.findMany({ select: { createdAt: true }, orderBy: { createdAt: "asc" } }),
      prisma.lease.groupBy({ by: ["status"], _count: true }),
    ]);

    const userGroups: Record<string, number> = {};
    userTrend.forEach((user) => {
      const month = user.createdAt.toLocaleDateString("es-CO", { month: "short", year: "2-digit" });
      userGroups[month] = (userGroups[month] ?? 0) + 1;
    });

    return {
      propertyData: propertyTypes.map((p) => ({ name: p.type, value: p._count })),
      userData: Object.entries(userGroups).map(([name, count]) => ({ name, usuarios: count })),
      leaseData: leaseStatus.map((l) => ({ name: l.status, value: l._count })),
    };
  },

  async getAllUsers() {
    return prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true },
    });
  },

  async getAllProperties() {
    return prisma.property.findMany({
      include: { owner: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "desc" },
    });
  },

  async updateUserRole(userId: string, role: Role) {
    return prisma.user.update({ where: { id: userId }, data: { role } });
  },

  async toggleUserStatus(userId: string, isActive: boolean) {
    return prisma.user.update({ where: { id: userId }, data: { isActive } });
  },
};
