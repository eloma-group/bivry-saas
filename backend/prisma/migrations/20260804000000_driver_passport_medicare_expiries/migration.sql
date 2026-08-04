-- AlterEnum
ALTER TYPE "driver_document_type" ADD VALUE IF NOT EXISTS 'PASSPORT_FRONT';
ALTER TYPE "driver_document_type" ADD VALUE IF NOT EXISTS 'PASSPORT_BACK';
ALTER TYPE "driver_document_type" ADD VALUE IF NOT EXISTS 'MEDICARE';

-- AlterTable
ALTER TABLE "driver_drug_tests" ADD COLUMN "expiry_date" DATE;

-- AlterTable
ALTER TABLE "driver_documents" ADD COLUMN "expiry_date" DATE;

-- CreateTable
CREATE TABLE "driver_passports" (
    "id" UUID NOT NULL,
    "driver_id" UUID NOT NULL,
    "passport_number" TEXT,
    "expiry_date" DATE,
    "verification_status" "verification_status" NOT NULL DEFAULT 'PENDING',
    "verified_at" TIMESTAMP(3),
    "verified_by" UUID,
    "remarks" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "driver_passports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_medicares" (
    "id" UUID NOT NULL,
    "driver_id" UUID NOT NULL,
    "card_number" TEXT,
    "expiry_date" DATE,
    "verification_status" "verification_status" NOT NULL DEFAULT 'PENDING',
    "verified_at" TIMESTAMP(3),
    "verified_by" UUID,
    "remarks" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "driver_medicares_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "driver_passports_driver_id_key" ON "driver_passports"("driver_id");

-- CreateIndex
CREATE UNIQUE INDEX "driver_medicares_driver_id_key" ON "driver_medicares"("driver_id");

-- AddForeignKey
ALTER TABLE "driver_passports" ADD CONSTRAINT "driver_passports_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_medicares" ADD CONSTRAINT "driver_medicares_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
