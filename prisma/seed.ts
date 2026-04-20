import { PrismaClient } from '@prisma/client';
import mongoose from 'mongoose';
import { ScrapedListing, AILog, ScrapingJob } from '../src/models/MongoSchemas';

const prisma = new PrismaClient();

async function main() {
  console.log(' Iniciando el proceso de Seeding...');

  // --- 1. SEED PARA MYSQL (PRISMA) ---
  const user = await prisma.user.upsert({
    where: { email: 'kevinsito@rentvago.com' },
    update: {},
    create: {
      email: 'kevinsito@rentvago.com',
      name: 'Kevin Uribe',
      properties: {
        create: {
          title: 'Apartamento en Laureles',
          address: 'Circular 4 #70-10, Medellín',
          price: 2800000,
          leases: {
            create: {
              startDate: new Date(),
              endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
              payments: {
                create: [
                  { amount: 2800000, status: 'paid' },
                  { amount: 2800000, status: 'pending' }
                ]
              }
            }
          }
        }
      }
    }
  });
  console.log('MySQL: Datos de prueba creados.');

  // --- 2. SEED PARA MONGODB (MONGOOSE) ---
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rentvago_mongo';
  
  await mongoose.connect(MONGODB_URI);
  
  // Limpiar datos previos en Mongo (Opcional)
  await ScrapedListing.deleteMany({});
  
  await ScrapedListing.create([
    {
      title: 'Casa amplia en El Poblado',
      price: 5000000,
      source: 'Finca Raíz',
      url: 'https://ejemplo.com/casa-poblado',
      location: 'Medellín'
    },
    {
      title: 'Estudio moderno en Belén',
      price: 1500000,
      source: 'Airbnb',
      url: 'https://ejemplo.com/estudio-belen',
      location: 'Medellín'
    }
  ]);

  await AILog.create({
    action: 'Análisis inicial',
    modelUsed: 'gemini-1.5-flash',
    response: { message: "Datos procesados correctamente" }
  });

  await ScrapingJob.create({
    status: 'completed',
    itemsFound: 2
  });

  console.log('MongoDB: Datos de prueba creados.');
  await mongoose.disconnect();
}

main()
  .catch((e) => {
    console.error('Error en el seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });