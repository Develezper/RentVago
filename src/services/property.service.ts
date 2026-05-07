import type { Property } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export const getPropertyById = async (id: string): Promise<Property | null> => {
  return prisma.property.findUnique({ where: { id } });
};

export const propertyService = {
  getPropertyById,
};
