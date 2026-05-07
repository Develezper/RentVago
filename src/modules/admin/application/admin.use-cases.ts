import type { Role } from "@/generated/prisma/enums";
import { GetBusinessStatsUseCase } from "@/modules/admin/application/get-business-stats.use-case";
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

export const adminUseCases = {
  getStats,
  getDashboardMetrics,
  getBusinessStats,
  getAllUsers,
  updateUserRole,
  toggleUserStatus,
};
