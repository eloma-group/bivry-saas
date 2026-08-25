-- A supplier now gives the two addresses the business is registered at: the
-- principal place of business, and where its invoices go. Warehouses are
-- unchanged and keep their own table, because they are sites freight moves
-- through rather than the address of the company.

-- CreateEnum
CREATE TYPE "vendor_address_type" AS ENUM ('PRINCIPAL', 'BILLING');

-- CreateTable
CREATE TABLE "vendor_addresses" (
    "id" UUID NOT NULL,
    "vendor_id" UUID NOT NULL,
    "type" "vendor_address_type" NOT NULL,
    "street1" TEXT,
    "street2" TEXT,
    "suburb" TEXT,
    "state" TEXT,
    "country" TEXT,
    "post_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_addresses_pkey" PRIMARY KEY ("id")
);

-- One row of each kind per supplier, so a save upserts rather than piles up.
-- CreateIndex
CREATE UNIQUE INDEX "vendor_addresses_vendor_id_type_key" ON "vendor_addresses"("vendor_id", "type");

-- AddForeignKey
ALTER TABLE "vendor_addresses" ADD CONSTRAINT "vendor_addresses_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
-- Whether the billing address was ticked as a copy of the principal one. Both
-- rows are written either way, so this only remembers how the form was filled.
ALTER TABLE "vendors" ADD COLUMN "billing_same_as_principal" BOOLEAN NOT NULL DEFAULT false;
