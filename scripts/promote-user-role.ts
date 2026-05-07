import { Role } from "../src/generated/prisma/enums";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const getDatabaseUrl = (): string => {
  const directUrl = process.env.DIRECT_URL;
  const pooledUrl = process.env.DATABASE_URL;
  if (directUrl) return directUrl;
  if (pooledUrl) return pooledUrl;
  throw new Error("DIRECT_URL or DATABASE_URL is required.");
};

const getTargetEmail = (): string => {
  const value = process.env.TARGET_EMAIL?.trim().toLowerCase();
  if (!value) throw new Error("TARGET_EMAIL is required.");
  return value;
};

const getTargetRole = (): Role => {
  const value = process.env.TARGET_ROLE?.trim().toUpperCase();
  if (!value || value === "SUPERADMIN") return Role.SUPERADMIN;
  if (value === "USER") return Role.USER;
  throw new Error("TARGET_ROLE must be SUPERADMIN or USER.");
};

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: getDatabaseUrl() }),
});

async function main(): Promise<void> {
  const email = getTargetEmail();
  const role = getTargetRole();

  const updated = await prisma.user.updateMany({
    where: { email },
    data: { role },
  });

  if (updated.count !== 1) {
    throw new Error(`User not found for email: ${email}`);
  }

  console.log(`User role updated: ${email} -> ${role}`);
}

main()
  .catch((error: unknown) => {
    console.error("Role update failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
