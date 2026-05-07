import type { Role } from "@/generated/prisma/enums";
import { adminRepository } from "@/modules/admin/infrastructure/admin.repository";

const getStats = () => {
  return adminRepository.getStats();
};

const getDashboardMetrics = () => {
  return adminRepository.getDashboardMetrics();
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
  getAllUsers,
  updateUserRole,
  toggleUserStatus,
};
