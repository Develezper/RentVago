import { LeaseStatus, PropertyStatus, PropertyType } from "@/generated/prisma/enums";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { AdminRepository } from "@/modules/admin/domain/admin.repository";
import type {
  AdminDashboardMetrics,
  AdminStats,
  AdminUser,
  LeaseCreateInput,
  LeaseUpdateInput,
  LeaseWithRelations,
  ScrapedPropertyInput,
  ScrapingFuenteCreateInput,
  ScrapingFuenteEntity,
  ScrapingFuenteUpdateInput,
} from "@/modules/admin/domain/admin.types";
import type { Role } from "@/generated/prisma/enums";

const leaseInclude = {
  property: { select: { id: true, title: true, location: true } },
  tenant: { select: { id: true, name: true, email: true } },
} as const;

type UserGrowthByMonthRow = {
  month_start: Date;
  total_users: bigint;
};

class PrismaAdminRepository implements AdminRepository {
  async getStats(): Promise<AdminStats> {
    const [activeUsers, totalProperties, totalLeases] = await Promise.all([
      prisma.user.count({ where: { isActive: true } }),
      prisma.property.count(),
      prisma.lease.count({ where: { status: LeaseStatus.ACTIVO } }),
    ]);

    return {
      activeUsers,
      totalProperties,
      totalLeases,
    };
  }

  async getDashboardMetrics(): Promise<AdminDashboardMetrics> {
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
      propertyData: propertyTypes.map((row) => ({ name: row.type, value: row._count })),
      userData: userTrend.map((entry) => ({
        name: entry.month_start.toLocaleDateString("es-CO", {
          month: "short",
          year: "2-digit",
        }),
        usuarios: Number(entry.total_users),
      })),
      leaseData: leaseStatus.map((row) => ({ name: row.status, value: row._count })),
    };
  }

  async getAllUsers(): Promise<AdminUser[]> {
    return prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  async updateUserRole(userId: string, role: Role): Promise<void> {
    await prisma.user.update({ where: { id: userId }, data: { role } });
  }

  async toggleUserStatus(userId: string, isActive: boolean): Promise<void> {
    await prisma.user.update({ where: { id: userId }, data: { isActive } });
  }

  async getAllLeases(): Promise<LeaseWithRelations[]> {
    return prisma.lease.findMany({
      include: leaseInclude,
      orderBy: { createdAt: "desc" },
    });
  }

  async getLeaseById(id: string): Promise<LeaseWithRelations | null> {
    return prisma.lease.findUnique({ where: { id }, include: leaseInclude });
  }

  async createLease(data: LeaseCreateInput): Promise<LeaseWithRelations> {
    return prisma.lease.create({
      data: {
        propertyId: data.propertyId,
        tenantId: data.tenantId,
        startDate: data.startDate,
        endDate: data.endDate,
        monthlyRent: data.monthlyRent,
        status: data.status ?? LeaseStatus.PENDIENTE,
      },
      include: leaseInclude,
    });
  }

  async updateLease(id: string, data: LeaseUpdateInput): Promise<LeaseWithRelations> {
    return prisma.lease.update({
      where: { id },
      data,
      include: leaseInclude,
    });
  }

  async deleteLease(id: string): Promise<void> {
    await prisma.lease.delete({ where: { id } });
  }

  async listScrapingSources(): Promise<ScrapingFuenteEntity[]> {
    return prisma.scrapingFuente.findMany({
      orderBy: { creadoEn: "desc" },
    });
  }

  async listActiveScrapingSources(): Promise<ScrapingFuenteEntity[]> {
    return prisma.scrapingFuente.findMany({ where: { activo: true } });
  }

  async createScrapingSource(
    data: ScrapingFuenteCreateInput,
  ): Promise<ScrapingFuenteEntity> {
    return prisma.scrapingFuente.create({ data });
  }

  async updateScrapingSource(
    id: string,
    data: ScrapingFuenteUpdateInput,
  ): Promise<ScrapingFuenteEntity> {
    return prisma.scrapingFuente.update({ where: { id }, data });
  }

  async deleteScrapingSource(id: string): Promise<void> {
    await prisma.scrapingFuente.delete({ where: { id } });
  }

  async upsertScrapedProperty(input: ScrapedPropertyInput): Promise<void> {
    await prisma.property.upsert({
      where: { sourceUrl: input.sourceUrl },
      update: {
        title: input.title,
        description: input.description,
        price: input.price,
        images: input.imageUrl ? [input.imageUrl] : [],
        status: PropertyStatus.AVAILABLE,
      },
      create: {
        title: input.title,
        description: input.description,
        price: input.price,
        location: input.location,
        images: input.imageUrl ? [input.imageUrl] : [],
        sourceUrl: input.sourceUrl,
        isScraped: true,
        type: PropertyType.APARTAMENTO,
        status: PropertyStatus.AVAILABLE,
      },
    });
  }
}

export const adminRepository: AdminRepository = new PrismaAdminRepository();
