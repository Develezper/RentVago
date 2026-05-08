import { LeaseStatus, PropertyStatus, PropertyType } from "@/generated/prisma/enums";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { aiService } from "@/modules/ai/ai.service";
import type { AdminRepository } from "@/modules/admin/domain/admin.repository";
import type {
  AdminBusinessStatsSnapshot,
  AdminDashboardMetrics,
  AdminMatchAlert,
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

type BusinessPropertyStatsRow = {
  approved_count: bigint;
  rejected_count: bigint;
  pending_count: bigint;
  scraped_count: bigint;
  direct_count: bigint;
};

type BusinessGrowthRow = {
  current_month_count: bigint;
  previous_month_count: bigint;
};

type HotZoneRow = {
  zone: string;
  searches: bigint;
};

type AlertsSummaryRow = {
  triggered_alerts: bigint;
  active_alerts: bigint;
};

type PropertiesByCityRow = {
  city_name: string;
  property_count: bigint;
};

type TopLeadPropertyRow = {
  property_id: string;
  property_title: string;
  leads_count: bigint;
};

class PrismaAdminRepository implements AdminRepository {
  async getStats(): Promise<AdminStats> {
    const [activeUsers, totalProperties, totalLeases, totalLeads] = await Promise.all([
      prisma.user.count({ where: { isActive: true } }),
      prisma.property.count(),
      prisma.lease.count({ where: { status: LeaseStatus.ACTIVO } }),
      prisma.lead.count(),
    ]);

    return {
      activeUsers,
      totalProperties,
      totalLeases,
      totalLeads,
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

  async getBusinessStatsSnapshot(): Promise<AdminBusinessStatsSnapshot> {
    const [
      propertyStats,
      growthStats,
      hotZones,
      alertsSummary,
      propertiesByCity,
      topLeadProperties,
    ] = await Promise.all([
      prisma.$queryRaw<BusinessPropertyStatsRow[]>(Prisma.sql`
        SELECT
          COUNT(*) FILTER (
            WHERE "isScraped" = false
              AND "status" IN ('AVAILABLE'::"PropertyStatus", 'RENTED'::"PropertyStatus")
          )::bigint AS approved_count,
          COUNT(*) FILTER (
            WHERE "isScraped" = false
              AND "status" = 'DRAFT'::"PropertyStatus"
          )::bigint AS rejected_count,
          COUNT(*) FILTER (
            WHERE "isScraped" = false
              AND "status" = 'PENDING_REVIEW'::"PropertyStatus"
          )::bigint AS pending_count,
          COUNT(*) FILTER (WHERE "isScraped" = true)::bigint AS scraped_count,
          COUNT(*) FILTER (WHERE "isScraped" = false)::bigint AS direct_count
        FROM "Property"
      `),
      prisma.$queryRaw<BusinessGrowthRow[]>(Prisma.sql`
        SELECT
          COUNT(*) FILTER (
            WHERE "createdAt" >= date_trunc('month', now())
              AND "createdAt" < date_trunc('month', now()) + interval '1 month'
          )::bigint AS current_month_count,
          COUNT(*) FILTER (
            WHERE "createdAt" >= date_trunc('month', now()) - interval '1 month'
              AND "createdAt" < date_trunc('month', now())
          )::bigint AS previous_month_count
        FROM "Property"
      `),
      prisma.$queryRaw<HotZoneRow[]>(Prisma.sql`
        SELECT
          initcap(lower(btrim("location"))) AS zone,
          COUNT(*)::bigint AS searches
        FROM "SearchFilter"
        WHERE "location" IS NOT NULL
          AND btrim("location") <> ''
        GROUP BY 1
        ORDER BY COUNT(*) DESC, zone ASC
        LIMIT 3
      `),
      prisma.$queryRaw<AlertsSummaryRow[]>(Prisma.sql`
        SELECT
          COUNT(*) FILTER (
            WHERE "createdAt" >= date_trunc('month', now())
              AND "createdAt" < date_trunc('month', now()) + interval '1 month'
              AND "message" LIKE 'MATCH:%'
          )::bigint AS triggered_alerts,
          (SELECT COUNT(*)::bigint FROM "SearchFilter") AS active_alerts
        FROM "Notification"
      `),
      prisma.$queryRaw<PropertiesByCityRow[]>(Prisma.sql`
        SELECT
          CASE
            WHEN "city" IS NULL OR btrim("city") = '' THEN 'Sin ciudad'
            ELSE initcap(lower(btrim("city")))
          END AS city_name,
          COUNT(*)::bigint AS property_count
        FROM "Property"
        GROUP BY 1
        ORDER BY COUNT(*) DESC, city_name ASC
      `),
      prisma.$queryRaw<TopLeadPropertyRow[]>(Prisma.sql`
        SELECT
          "Lead"."propertyId" AS property_id,
          "Property"."title" AS property_title,
          COUNT(*)::bigint AS leads_count
        FROM "Lead"
        INNER JOIN "Property" ON "Property"."id" = "Lead"."propertyId"
        GROUP BY "Lead"."propertyId", "Property"."title"
        ORDER BY COUNT(*) DESC, "Property"."title" ASC
        LIMIT 5
      `),
    ]);

    const property = propertyStats[0];
    const growth = growthStats[0];
    const alerts = alertsSummary[0];
    const toSafeNumber = (value: bigint | number | undefined): number => Number(value ?? 0);

    return {
      approvedProperties: toSafeNumber(property?.approved_count),
      rejectedProperties: toSafeNumber(property?.rejected_count),
      pendingProperties: toSafeNumber(property?.pending_count),
      scrapedProperties: toSafeNumber(property?.scraped_count),
      directProperties: toSafeNumber(property?.direct_count),
      currentMonthProperties: toSafeNumber(growth?.current_month_count),
      previousMonthProperties: toSafeNumber(growth?.previous_month_count),
      triggeredAlertsThisMonth: toSafeNumber(alerts?.triggered_alerts),
      activeAlerts: toSafeNumber(alerts?.active_alerts),
      hotZones: hotZones.map((zone) => ({
        zone: zone.zone,
        searches: toSafeNumber(zone.searches),
      })),
      propertiesByCity: propertiesByCity.map((cityRow) => ({
        city: cityRow.city_name,
        properties: toSafeNumber(cityRow.property_count),
      })),
      topLeadProperties: topLeadProperties.map((entry) => ({
        propertyId: entry.property_id,
        title: entry.property_title,
        leads: toSafeNumber(entry.leads_count),
      })),
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

  async getAllMatchAlerts(): Promise<AdminMatchAlert[]> {
    return prisma.matchAlert.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        phone: true,
        criteria: true,
        status: true,
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
    const rawImages =
      input.imageUrls && input.imageUrls.length > 0
        ? input.imageUrls
        : input.imageUrl
          ? [input.imageUrl]
          : [];

    const images = Array.from(
      new Set(
        rawImages
          .map((image) => image.trim())
          .filter((image) => image.length > 0 && /^https?:\/\//i.test(image)),
      ),
    );

    const updateData: Prisma.PropertyUpdateInput = {
      title: input.title,
      description: input.description,
      price: input.price,
      location: input.location,
      status: PropertyStatus.AVAILABLE,
      ...(input.city ? { city: input.city } : {}),
      ...(input.neighborhood ? { neighborhood: input.neighborhood } : {}),
      ...(input.rooms !== undefined ? { rooms: input.rooms } : {}),
      // Evita borrar imágenes válidas cuando Apify no devuelve fotos en una corrida puntual.
      ...(images.length > 0 ? { images } : {}),
    };

    const persisted = await prisma.property.upsert({
      where: { sourceUrl: input.sourceUrl },
      update: updateData,
      create: {
        title: input.title,
        description: input.description,
        price: input.price,
        location: input.location,
        city: input.city,
        neighborhood: input.neighborhood,
        rooms: input.rooms,
        images,
        sourceUrl: input.sourceUrl,
        isScraped: true,
        type: PropertyType.APARTAMENTO,
        status: PropertyStatus.AVAILABLE,
      },
      select: {
        id: true,
        title: true,
        description: true,
        price: true,
        city: true,
        neighborhood: true,
        rooms: true,
      },
    });

    await aiService.generateAndPersistPropertyEmbedding({
      id: persisted.id,
      title: persisted.title,
      description: persisted.description,
      price: persisted.price,
      city: persisted.city,
      neighborhood: persisted.neighborhood,
      rooms: persisted.rooms,
    });
  }
}

export const adminRepository: AdminRepository = new PrismaAdminRepository();
