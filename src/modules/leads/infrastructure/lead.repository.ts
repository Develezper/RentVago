import { PropertyStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import type { LeadRepository } from "@/modules/leads/domain/lead.repository";

class PrismaLeadRepository implements LeadRepository {
  async findPropertyLeadTarget(propertyId: string) {
    return prisma.property.findFirst({
      where: { id: propertyId, status: PropertyStatus.AVAILABLE },
      select: {
        id: true,
        title: true,
        ownerId: true,
      },
    });
  }

  async createLead(input: { propertyId: string; userId: string; ownerId: string }) {
    return prisma.lead.create({
      data: {
        propertyId: input.propertyId,
        userId: input.userId,
        ownerId: input.ownerId,
      },
      select: {
        id: true,
        propertyId: true,
        userId: true,
        ownerId: true,
        status: true,
        createdAt: true,
      },
    });
  }
}

export const leadRepository: LeadRepository = new PrismaLeadRepository();
