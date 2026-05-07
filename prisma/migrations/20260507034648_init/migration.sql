-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'SUPERADMIN');

-- CreateEnum
CREATE TYPE "PropertyType" AS ENUM ('CASA', 'APARTAMENTO');

-- CreateEnum
CREATE TYPE "LeaseStatus" AS ENUM ('ACTIVO', 'PENDIENTE', 'EXPIRADO');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "tokenVersion" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Property" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "images" TEXT[],
    "price" DECIMAL(12,2) NOT NULL,
    "location" TEXT NOT NULL,
    "rooms" INTEGER,
    "type" "PropertyType" NOT NULL DEFAULT 'CASA',
    "sourceUrl" TEXT,
    "isScraped" BOOLEAN NOT NULL DEFAULT false,
    "ownerId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lease" (
    "id" UUID NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "monthlyRent" DECIMAL(10,2) NOT NULL,
    "status" "LeaseStatus" NOT NULL DEFAULT 'PENDIENTE',
    "propertyId" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lease_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" UUID NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "leaseId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" UUID NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SearchFilter" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "query" TEXT,
    "minPrice" DECIMAL(12,2),
    "maxPrice" DECIMAL(12,2),
    "location" TEXT,
    "rooms" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SearchFilter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Favorite" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "propertyId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScrapingFuente" (
    "id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScrapingFuente_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "Property_sourceUrl_key" ON "Property"("sourceUrl");

-- CreateIndex
CREATE INDEX "Property_ownerId_idx" ON "Property"("ownerId");

-- CreateIndex
CREATE INDEX "Property_location_idx" ON "Property"("location");

-- CreateIndex
CREATE INDEX "Property_rooms_idx" ON "Property"("rooms");

-- CreateIndex
CREATE INDEX "Property_price_idx" ON "Property"("price");

-- CreateIndex
CREATE INDEX "Property_location_rooms_price_idx" ON "Property"("location", "rooms", "price");

-- CreateIndex
CREATE INDEX "Lease_propertyId_idx" ON "Lease"("propertyId");

-- CreateIndex
CREATE INDEX "Lease_tenantId_idx" ON "Lease"("tenantId");

-- CreateIndex
CREATE INDEX "Lease_status_idx" ON "Lease"("status");

-- CreateIndex
CREATE INDEX "Payment_leaseId_idx" ON "Payment"("leaseId");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- CreateIndex
CREATE INDEX "SearchFilter_userId_idx" ON "SearchFilter"("userId");

-- CreateIndex
CREATE INDEX "SearchFilter_userId_createdAt_idx" ON "SearchFilter"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Favorite_userId_idx" ON "Favorite"("userId");

-- CreateIndex
CREATE INDEX "Favorite_propertyId_idx" ON "Favorite"("propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "Favorite_userId_propertyId_key" ON "Favorite"("userId", "propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "ScrapingFuente_url_key" ON "ScrapingFuente"("url");

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lease" ADD CONSTRAINT "Lease_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lease" ADD CONSTRAINT "Lease_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SearchFilter" ADD CONSTRAINT "SearchFilter_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Full-Text Search ─────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE OR REPLACE FUNCTION immutable_unaccent(input_text text)
RETURNS text LANGUAGE sql IMMUTABLE PARALLEL SAFE
SET search_path = public, extensions
AS $$
  SELECT unaccent(input_text)
$$;

ALTER TABLE "Property"
ADD COLUMN "search_vector" tsvector GENERATED ALWAYS AS (
  to_tsvector(
    'spanish',
    immutable_unaccent(lower(coalesce("title", '') || ' ' || coalesce("description", '')))
  )
) STORED;

CREATE INDEX "Property_search_vector_gin_idx"
ON "Property" USING GIN ("search_vector");

CREATE INDEX "Property_location_normalized_trgm_idx"
ON "Property" USING GIN (immutable_unaccent(lower("location")) gin_trgm_ops);
