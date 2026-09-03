-- What we charge the customer, as rows rather than as seven columns.
--
-- A booking held exactly one price, so a booking that loads at two places had
-- nowhere to put the second thing it charges for. Our Price now shows a column
-- per price, numbered, and each is a row here ordered by `position` - the order
-- the columns are shown in, which is what makes "Gross Amount 2" the second
-- one. `bookings.price_final_amount` is their totals added together, stored
-- rather than summed on read so a booking always quotes the figure the admin
-- saw when they saved it.
--
-- The vendor price is deliberately untouched and stays on the booking: we agree
-- one figure with a vendor for the whole job.
--
-- Nothing is lost. Every price already stored is copied into a row of its own
-- at position 0 before the old columns go, and its total becomes the booking's
-- final amount, which for a single price is the same number.

-- CreateTable
CREATE TABLE "booking_prices" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "gross_amount" DECIMAL(12,2),
    "fuel_levy_pct" DECIMAL(7,2),
    "fuel_levy_amount" DECIMAL(12,2),
    "gst_pct" DECIMAL(7,2),
    "gst_amount" DECIMAL(12,2),
    "net_amount" DECIMAL(12,2),
    "total_amount" DECIMAL(12,2),

    CONSTRAINT "booking_prices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "booking_prices_booking_id_idx" ON "booking_prices"("booking_id");

-- AddForeignKey
ALTER TABLE "booking_prices" ADD CONSTRAINT "booking_prices_booking_id_fkey"
  FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN "price_final_amount" DECIMAL(12,2);

-- Carry every stored price over as the booking's first and only price. A
-- booking that never had one - every amount null - gets no row, because an
-- empty price column is not a price.
INSERT INTO "booking_prices" (
  "id", "booking_id", "position",
  "gross_amount", "fuel_levy_pct", "fuel_levy_amount",
  "gst_pct", "gst_amount", "net_amount", "total_amount"
)
SELECT
  gen_random_uuid(), "id", 0,
  "price_gross_amount", "price_fuel_levy_pct", "price_fuel_levy_amount",
  "price_gst_pct", "price_gst_amount", "price_net_amount", "price_total_amount"
FROM "bookings"
WHERE COALESCE(
        "price_gross_amount", "price_fuel_levy_pct", "price_fuel_levy_amount",
        "price_gst_pct", "price_gst_amount", "price_net_amount", "price_total_amount"
      ) IS NOT NULL;

-- With one price, the final amount is that price's total.
UPDATE "bookings" SET "price_final_amount" = "price_total_amount"
 WHERE "price_total_amount" IS NOT NULL;

-- AlterTable
ALTER TABLE "bookings"
  DROP COLUMN "price_gross_amount",
  DROP COLUMN "price_fuel_levy_pct",
  DROP COLUMN "price_fuel_levy_amount",
  DROP COLUMN "price_gst_pct",
  DROP COLUMN "price_gst_amount",
  DROP COLUMN "price_net_amount",
  DROP COLUMN "price_total_amount";
