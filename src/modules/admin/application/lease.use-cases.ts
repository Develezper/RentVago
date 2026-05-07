import type { LeaseCreateInput, LeaseUpdateInput } from "@/modules/admin/domain/admin.types";
import { adminRepository } from "@/modules/admin/infrastructure/admin.repository";

const getAllLeases = () => {
  return adminRepository.getAllLeases();
};

const getLeaseById = (id: string) => {
  return adminRepository.getLeaseById(id);
};

const createLease = (data: LeaseCreateInput) => {
  return adminRepository.createLease(data);
};

const updateLease = (id: string, data: LeaseUpdateInput) => {
  return adminRepository.updateLease(id, data);
};

const deleteLease = (id: string) => {
  return adminRepository.deleteLease(id);
};

export const leaseUseCases = {
  getAllLeases,
  getLeaseById,
  createLease,
  updateLease,
  deleteLease,
};
