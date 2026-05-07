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
    type UserGrowthByMonthRow = {
      month_start: Date;
      total_users: bigint;
    };

    const [propertyTypes, userTrend, leaseStatus] = await Promise.all([
      prisma.property.groupBy({ by: ["type"], _count: true }),
      prisma.$queryRaw<UserGrowthByMonthRow[]>(Prisma.sql`
        SELECT date_trunc('month', "createdAt") AS month_start,
               COUNT(*)::bigint AS total_users
        FROM "User"
        GROUP BY 1
        ORDER BY 1 ASC
      `),
      prisma.lease.groupBy({ by: ["status"], _count: true }),
    ]);

    return {
      propertyData: propertyTypes.map((p) => ({ name: p.type, value: p._count })),
      userData: userTrend.map((entry) => ({
        name: entry.month_start.toLocaleDateString("es-CO", {
          month: "short",
          year: "2-digit",
        }),
        usuarios: Number(entry.total_users),
      })),
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
