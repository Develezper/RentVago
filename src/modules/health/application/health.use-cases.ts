import { healthRepository } from "@/modules/health/infrastructure/health.repository";

const check = async () => {
  await healthRepository.ping();
  return { status: "ok" as const };
};

export const healthUseCases = {
  check,
};
