import { defineConfig } from "prisma/config";
import { readFileSync } from "fs";
import { resolve } from "path";

// Prisma evalúa este archivo antes de que Bun cargue .env, así que lo cargamos manualmente
try {
  const lines = readFileSync(resolve(process.cwd(), ".env"), "utf-8").split("\n");
  for (const line of lines) {
    const match = line.match(/^\s*([^#][^=]*?)\s*=\s*["']?(.*?)["']?\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
  }
} catch {}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  },
});
