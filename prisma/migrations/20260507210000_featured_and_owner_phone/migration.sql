ALTER TABLE "User"
ADD COLUMN "phone" TEXT;

ALTER TABLE "Property"
ADD COLUMN "isFeatured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "featuredUntil" TIMESTAMP(3);

CREATE INDEX "Property_isFeatured_featuredUntil_idx"
ON "Property"("isFeatured", "featuredUntil");
