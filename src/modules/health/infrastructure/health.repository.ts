import { prisma } from "@/lib/prisma";
import type { HealthRepository } from "@/modules/health/domain/health.repository";

const ping = async (): Promise<void> => {
  await prisma.$queryRaw`SELECT 1`;
};

export const healthRepository: HealthRepository = {
  ping,
};
