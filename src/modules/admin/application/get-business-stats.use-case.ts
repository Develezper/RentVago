import type { AdminRepository } from "@/modules/admin/domain/admin.repository";
import type { AdminBusinessStats } from "@/modules/admin/domain/admin.types";

const toPercentage = (numerator: number, denominator: number): number => {
  if (denominator <= 0) return 0;
  return Number(((numerator / denominator) * 100).toFixed(2));
};

const resolveGrowthRate = (currentMonth: number, previousMonth: number): number => {
  if (previousMonth === 0) return currentMonth > 0 ? 100 : 0;
  return Number((((currentMonth - previousMonth) / previousMonth) * 100).toFixed(2));
};

export class GetBusinessStatsUseCase {
  constructor(private readonly repository: AdminRepository) {}

  async execute(): Promise<AdminBusinessStats> {
    const snapshot = await this.repository.getBusinessStatsSnapshot();

    const totalReviewed = snapshot.approvedProperties + snapshot.rejectedProperties;

    return {
      conversion: {
        approved: snapshot.approvedProperties,
        rejected: snapshot.rejectedProperties,
        pending: snapshot.pendingProperties,
        totalReviewed,
        approvalRate: toPercentage(snapshot.approvedProperties, totalReviewed),
        rejectionRate: toPercentage(snapshot.rejectedProperties, totalReviewed),
      },
      growth: {
        currentMonth: snapshot.currentMonthProperties,
        previousMonth: snapshot.previousMonthProperties,
        growthRate: resolveGrowthRate(
          snapshot.currentMonthProperties,
          snapshot.previousMonthProperties,
        ),
      },
      propertyOriginData: [
        { name: "Scraping", value: snapshot.scrapedProperties },
        { name: "Directas", value: snapshot.directProperties },
      ],
      matchRate: {
        triggeredThisMonth: snapshot.triggeredAlertsThisMonth,
        activeAlerts: snapshot.activeAlerts,
        rate: toPercentage(snapshot.triggeredAlertsThisMonth, snapshot.activeAlerts),
      },
      hotZones: snapshot.hotZones,
    };
  }
}
