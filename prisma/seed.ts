import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PropertyStatus, PropertyType, Role } from "../src/generated/prisma/enums";

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

const adminSeedEmail = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase() ?? "admin@rentvago.local";
const employeeSeedEmail =
  process.env.SEED_EMPLOYEE_EMAIL?.trim().toLowerCase() ?? "employee@rentvago.local";

const adminSeedPassword =
  process.env.SEED_ADMIN_PASSWORD ?? "RentVago_Admin#2026_Secure!";
const employeeSeedPassword =
  process.env.SEED_EMPLOYEE_PASSWORD ?? "RentVago_Employee#2026_Secure!";

const sampleProperties = (ownerId: string) => [
  {
    sourceUrl: "seed://direct/poblado-loft-01",
    title: "Loft ejecutivo en El Poblado",
    description:
      "Loft amoblado con balcón, cocina integral y acceso a coworking. Ideal para profesionales.",
    location: "El Poblado, Medellín",
    city: "Medellín",
    neighborhood: "El Poblado",
    price: 3200000,
    rooms: 1,
    type: PropertyType.APARTAMENTO,
    status: PropertyStatus.AVAILABLE,
    isScraped: false,
    ownerId,
    images: [
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1600",
      "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=1600",
      "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=1600",
    ],
  },
  {
    sourceUrl: "seed://direct/envigado-family-02",
    title: "Apartamento familiar en Envigado",
    description:
      "Unidad cerrada con zonas verdes, dos parqueaderos y excelente conexión a transporte.",
    location: "Envigado, Antioquia",
    city: "Envigado",
    neighborhood: "La Magnolia",
    price: 2800000,
    rooms: 3,
    type: PropertyType.APARTAMENTO,
    status: PropertyStatus.PENDING_REVIEW,
    isScraped: false,
    ownerId,
    images: [
      "https://images.unsplash.com/photo-1460317442991-0ec209397118?w=1600",
      "https://images.unsplash.com/photo-1493666438817-866a91353ca9?w=1600",
      "https://images.unsplash.com/photo-1481277542470-605612bd2d61?w=1600",
    ],
  },
  {
    sourceUrl: "seed://scraping/bello-casa-03",
    title: "Casa amplia en Bello sector central",
    description:
      "Casa de dos niveles con terraza, patio interno y buena iluminación natural.",
    location: "Bello, Antioquia",
    city: "Bello",
    neighborhood: "Centro",
    price: 2100000,
    rooms: 4,
    type: PropertyType.CASA,
    status: PropertyStatus.AVAILABLE,
    isScraped: true,
    ownerId: null,
    images: [
      "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1600",
      "https://images.unsplash.com/photo-1572120360610-d971b9d7767c?w=1600",
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1600",
    ],
  },
  {
    sourceUrl: "seed://scraping/sabaneta-apartamento-04",
    title: "Apartamento moderno en Sabaneta",
    description:
      "Torre nueva con gimnasio, piscina y acabados premium. Cerca al metro.",
    location: "Sabaneta, Antioquia",
    city: "Sabaneta",
    neighborhood: "Las Vegas",
    price: 2600000,
    rooms: 2,
    type: PropertyType.APARTAMENTO,
    status: PropertyStatus.AVAILABLE,
    isScraped: true,
    ownerId: null,
    images: [
      "https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?w=1600",
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1600",
      "https://images.unsplash.com/photo-1507089947368-19c1da9775ae?w=1600",
    ],
  },
  {
    sourceUrl: "seed://direct/laureles-patio-05",
    title: "Casa en Laureles con patio interno",
    description:
      "Propiedad ideal para familia, con estudio, patio cubierto y cocina remodelada.",
    location: "Laureles, Medellín",
    city: "Medellín",
    neighborhood: "Laureles",
    price: 3900000,
    rooms: 4,
    type: PropertyType.CASA,
    status: PropertyStatus.PENDING_REVIEW,
    isScraped: false,
    ownerId,
    images: [
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1600",
      "https://images.unsplash.com/photo-1600573472550-8090b5e0745e?w=1600",
      "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=1600",
    ],
  },
];

async function main(): Promise<void> {
  const [adminPasswordHash, employeePasswordHash] = await Promise.all([
    bcrypt.hash(adminSeedPassword, 12),
    bcrypt.hash(employeeSeedPassword, 12),
  ]);

  const adminUser = await prisma.user.upsert({
    where: { email: adminSeedEmail },
    update: {
      name: "Admin RentVago",
      role: Role.ADMIN,
      isActive: true,
      passwordHash: adminPasswordHash,
    },
    create: {
      email: adminSeedEmail,
      name: "Admin RentVago",
      role: Role.ADMIN,
      isActive: true,
      passwordHash: adminPasswordHash,
    },
  });

  const employeeUser = await prisma.user.upsert({
    where: { email: employeeSeedEmail },
    update: {
      name: "Employee RentVago",
      role: Role.EMPLOYEE,
      isActive: true,
      passwordHash: employeePasswordHash,
    },
    create: {
      email: employeeSeedEmail,
      name: "Employee RentVago",
      role: Role.EMPLOYEE,
      isActive: true,
      passwordHash: employeePasswordHash,
    },
  });

  const properties = sampleProperties(employeeUser.id);

  for (const property of properties) {
    await prisma.property.upsert({
      where: { sourceUrl: property.sourceUrl },
      update: {
        title: property.title,
        description: property.description,
        location: property.location,
        city: property.city,
        neighborhood: property.neighborhood,
        price: property.price,
        rooms: property.rooms,
        type: property.type,
        status: property.status,
        isScraped: property.isScraped,
        ownerId: property.ownerId,
        images: property.images,
      },
      create: property,
    });
  }

  console.info(`Seed completed. Admin: ${adminUser.email}, Employee: ${employeeUser.email}`);
}

main()
  .catch((error: unknown) => {
    console.error("Seeding failed.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
