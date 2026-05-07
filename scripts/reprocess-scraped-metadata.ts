import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import {
  extractNeighborhoodFromDescription,
  extractRoomsFromDescription,
  resolveCanonicalCity,
} from "../src/modules/admin/infrastructure/apify-facebook.service";

type ScrapedPropertyRow = {
  id: string;
  description: string;
  rooms: number | null;
  city: string | null;
  neighborhood: string | null;
  ownerId: string | null;
};

const BATCH_SIZE = 500;

const getDatabaseUrl = (): string => {
  const directUrl = process.env.DIRECT_URL;
  const pooledUrl = process.env.DATABASE_URL;

  if (directUrl) return directUrl;
  if (pooledUrl) return pooledUrl;

  throw new Error("DIRECT_URL or DATABASE_URL is required.");
};

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: getDatabaseUrl() }),
});

async function fetchBatch(cursorId?: string): Promise<ScrapedPropertyRow[]> {
  return prisma.property.findMany({
    where: {
      isScraped: true,
      ownerId: null,
    },
    orderBy: { id: "asc" },
    take: BATCH_SIZE,
    ...(cursorId
      ? {
          cursor: { id: cursorId },
          skip: 1,
        }
      : {}),
    select: {
      id: true,
      description: true,
      rooms: true,
      city: true,
      neighborhood: true,
      ownerId: true,
    },
  });
}

async function main(): Promise<void> {
  const totalScraped = await prisma.property.count({
    where: {
      isScraped: true,
      ownerId: null,
    },
  });

  if (totalScraped === 0) {
    console.info("No hay propiedades scrapeadas históricas sin owner para reprocesar.");
    return;
  }

  console.info(
    `Iniciando reproceso de metadata para ${totalScraped} propiedades scrapeadas históricas (ownerId=null)...`,
  );

  let scanned = 0;
  let updatedRows = 0;
  let roomsUpdated = 0;
  let cityUpdated = 0;
  let neighborhoodUpdated = 0;
  let cursorId: string | undefined;

  while (true) {
    const batch = await fetchBatch(cursorId);

    if (batch.length === 0) {
      break;
    }

    for (const property of batch) {
      scanned += 1;
      const description = (property.description ?? "").trim();

      if (description.length === 0) {
        continue;
      }

      const nextRooms = extractRoomsFromDescription(description);
      const nextCity = resolveCanonicalCity(description);
      const nextNeighborhood = extractNeighborhoodFromDescription(description);

      const data: {
        rooms?: number;
        city?: string;
        neighborhood?: string;
      } = {};

      const isRoomsMissing = property.rooms === null || property.rooms === 0;
      if (isRoomsMissing && nextRooms !== undefined && nextRooms > 0) {
        data.rooms = nextRooms;
        roomsUpdated += 1;
      }

      const isCityMissing = property.city === null || property.city.trim().length === 0;
      if (isCityMissing && nextCity) {
        data.city = nextCity;
        cityUpdated += 1;
      }

      const isNeighborhoodMissing =
        property.neighborhood === null || property.neighborhood.trim().length === 0;
      if (isNeighborhoodMissing && nextNeighborhood) {
        data.neighborhood = nextNeighborhood;
        neighborhoodUpdated += 1;
      }

      if (Object.keys(data).length === 0) {
        continue;
      }

      // Defensa adicional: no actualizar nada que no sea scrapeado.
      const result = await prisma.property.updateMany({
        where: {
          id: property.id,
          isScraped: true,
          ownerId: null,
        },
        data,
      });

      if (result.count > 0) {
        updatedRows += 1;
      }
    }

    cursorId = batch[batch.length - 1]?.id;
    console.info(`Progreso: ${scanned}/${totalScraped} analizadas, ${updatedRows} actualizadas.`);
  }

  console.info("Reproceso finalizado.");
  console.info(`Filas analizadas: ${scanned}`);
  console.info(`Filas actualizadas: ${updatedRows}`);
  console.info(`rooms actualizados: ${roomsUpdated}`);
  console.info(`city actualizados: ${cityUpdated}`);
  console.info(`neighborhood actualizados: ${neighborhoodUpdated}`);
}

main()
  .catch((error: unknown) => {
    console.error("Reproceso fallido:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
