-- A unit, suite or flat number, on every address the product asks for.
--
-- It used to be typed into the street line, so "Suite 3, 12 Balaclava Road"
-- and "12 Balaclava Road" were the same column answering two questions. Its own
-- column keeps the street line to the street. Nullable throughout: plenty of
-- addresses have no suite, and every address already stored has none recorded.

-- AlterTable
ALTER TABLE "customer_addresses" ADD COLUMN "suite" TEXT;
ALTER TABLE "customer_warehouses" ADD COLUMN "suite" TEXT;
ALTER TABLE "vendor_addresses" ADD COLUMN "suite" TEXT;
ALTER TABLE "vendor_warehouses" ADD COLUMN "suite" TEXT;
ALTER TABLE "vendor_yards" ADD COLUMN "suite" TEXT;
ALTER TABLE "driver_addresses" ADD COLUMN "suite" TEXT;
ALTER TABLE "booking_stops" ADD COLUMN "suite" TEXT;
