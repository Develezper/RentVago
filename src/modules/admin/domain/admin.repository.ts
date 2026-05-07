import type { Role } from "@/generated/prisma/enums";
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
} from "./admin.types";

export interface AdminRepository {
  getStats(): Promise<AdminStats>;
  getDashboardMetrics(): Promise<AdminDashboardMetrics>;

  getAllUsers(): Promise<AdminUser[]>;
  updateUserRole(userId: string, role: Role): Promise<void>;
  toggleUserStatus(userId: string, isActive: boolean): Promise<void>;

  getAllLeases(): Promise<LeaseWithRelations[]>;
  getLeaseById(id: string): Promise<LeaseWithRelations | null>;
  createLease(data: LeaseCreateInput): Promise<LeaseWithRelations>;
  updateLease(id: string, data: LeaseUpdateInput): Promise<LeaseWithRelations>;
  deleteLease(id: string): Promise<void>;

  listScrapingSources(): Promise<ScrapingFuenteEntity[]>;
  listActiveScrapingSources(): Promise<ScrapingFuenteEntity[]>;
  createScrapingSource(data: ScrapingFuenteCreateInput): Promise<ScrapingFuenteEntity>;
  updateScrapingSource(id: string, data: ScrapingFuenteUpdateInput): Promise<ScrapingFuenteEntity>;
  deleteScrapingSource(id: string): Promise<void>;

  upsertScrapedProperty(input: ScrapedPropertyInput): Promise<void>;
}
