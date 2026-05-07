import { prisma } from "@/lib/prisma";
import type { LeaseStatus } from "@/generated/prisma/enums";

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

const leaseInclude = {
  property: { select: { id: true, title: true, location: true } },
  tenant: { select: { id: true, name: true, email: true } },
} as const;

export const leaseService = {
  async getAllLeases() {
    return prisma.lease.findMany({
      include: leaseInclude,
      orderBy: { createdAt: "desc" },
    });
  },

  async getLeaseById(id: string) {
    return prisma.lease.findUnique({ where: { id }, include: leaseInclude });
  },

  async createLease(data: LeaseCreateInput) {
    return prisma.lease.create({
      data: {
        propertyId: data.propertyId,
        tenantId: data.tenantId,
        startDate: data.startDate,
        endDate: data.endDate,
        monthlyRent: data.monthlyRent,
        status: data.status ?? "PENDIENTE",
      },
      include: leaseInclude,
    });
  },

  async updateLease(id: string, data: LeaseUpdateInput) {
    return prisma.lease.update({
      where: { id },
      data,
      include: leaseInclude,
    });
  },

  async deleteLease(id: string) {
    return prisma.lease.delete({ where: { id } });
  },
};
