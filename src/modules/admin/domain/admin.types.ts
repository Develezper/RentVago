import type { LeaseStatus, Role } from "@/generated/prisma/enums";

export interface AdminStats {
  activeUsers: number;
  totalProperties: number;
  totalLeases: number;
  totalLeads: number;
}

export interface AdminDashboardMetrics {
  propertyData: Array<{ name: string; value: number }>;
  userData: Array<{ name: string; usuarios: number }>;
  leaseData: Array<{ name: string; value: number }>;
}

export interface AdminBusinessStatsSnapshot {
  approvedProperties: number;
  rejectedProperties: number;
  pendingProperties: number;
  scrapedProperties: number;
  directProperties: number;
  currentMonthProperties: number;
  previousMonthProperties: number;
  triggeredAlertsThisMonth: number;
  activeAlerts: number;
  hotZones: Array<{ zone: string; searches: number }>;
  propertiesByCity: Array<{ city: string; properties: number }>;
}

export interface AdminBusinessStats {
  conversion: {
    approved: number;
    rejected: number;
    pending: number;
    totalReviewed: number;
    approvalRate: number;
    rejectionRate: number;
  };
  growth: {
    currentMonth: number;
    previousMonth: number;
    growthRate: number;
  };
  propertyOriginData: Array<{ name: string; value: number }>;
  matchRate: {
    triggeredThisMonth: number;
    activeAlerts: number;
    rate: number;
  };
  hotZones: Array<{ zone: string; searches: number }>;
  propertiesByCity: Array<{ city: string; properties: number }>;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  isActive: boolean;
  createdAt: Date;
}

export interface LeaseWithRelations {
  id: string;
  propertyId: string;
  tenantId: string;
  startDate: Date;
  endDate: Date;
  monthlyRent: { toString(): string };
  status: LeaseStatus;
  createdAt: Date;
  property: { id: string; title: string; location: string };
  tenant: { id: string; name: string | null; email: string };
}

export interface LeaseCreateInput {
  propertyId: string;
  tenantId: string;
  startDate: Date;
  endDate: Date;
  monthlyRent: number;
  status?: LeaseStatus;
}

export interface LeaseUpdateInput {
  propertyId?: string;
  tenantId?: string;
  startDate?: Date;
  endDate?: Date;
  monthlyRent?: number;
  status?: LeaseStatus;
}

export interface ScrapingFuenteEntity {
  id: string;
  nombre: string;
  url: string;
  activo: boolean;
  creadoEn: Date;
}

export interface ScrapingFuenteCreateInput {
  nombre: string;
  url: string;
  activo: boolean;
}

export interface ScrapingFuenteUpdateInput {
  nombre?: string;
  url?: string;
  activo?: boolean;
}

export interface ScrapedPropertyInput {
  title: string;
  description: string;
  price: number;
  location: string;
  imageUrls?: string[];
  imageUrl?: string;
  sourceUrl: string;
}
