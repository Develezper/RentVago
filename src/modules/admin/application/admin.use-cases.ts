import type { Role } from "@/generated/prisma/enums";
import { GetBusinessStatsUseCase } from "@/modules/admin/application/get-business-stats.use-case";
import type { ScrapedPropertyInput } from "@/modules/admin/domain/admin.types";
import { adminRepository } from "@/modules/admin/infrastructure/admin.repository";

const getBusinessStatsUseCase = new GetBusinessStatsUseCase(adminRepository);

const getStats = () => {
  return adminRepository.getStats();
};

const getDashboardMetrics = () => {
  return adminRepository.getDashboardMetrics();
};

const getBusinessStats = () => {
  return getBusinessStatsUseCase.execute();
};

const getAllUsers = () => {
  return adminRepository.getAllUsers();
};

const updateUserRole = (userId: string, role: Role) => {
  return adminRepository.updateUserRole(userId, role);
};

const toggleUserStatus = (userId: string, isActive: boolean) => {
  return adminRepository.toggleUserStatus(userId, isActive);
};

const upsertScrapedProperties = async (
  scrapedProperties: ScrapedPropertyInput[],
): Promise<{ saved: number }> => {
  let saved = 0;

  for (const property of scrapedProperties) {
    await adminRepository.upsertScrapedProperty(property);
    saved += 1;
  }

  return { saved };
};

export const adminUseCases = {
  getStats,
  getDashboardMetrics,
  getBusinessStats,
  getAllUsers,
  updateUserRole,
  toggleUserStatus,
  upsertScrapedProperties,
};
