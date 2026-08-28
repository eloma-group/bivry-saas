-- Bookings raised in the Admin portal, on their own set of tables.

-- CreateEnum
CREATE TYPE "booking_stop_type" AS ENUM ('PICKUP', 'DELIVERY');

-- CreateTable
CREATE TABLE "bookings" (
    "id" UUID NOT NULL,
    "job_number" TEXT NOT NULL,
    "booking_received_date" TEXT,
    "financial_year" TEXT,
    "customer_id" UUID,
    "customer_name" TEXT,
    "customer_account_number" TEXT,
    "account_status" TEXT,
    "agreement_type" TEXT,
    "reference" TEXT,
    "cargo_type" TEXT,
    "vehicle_type" TEXT,
    "trailer_category" TEXT,
    "price_gross_amount" DECIMAL(12,2),
    "price_fuel_levy_pct" DECIMAL(7,2),
    "price_fuel_levy_amount" DECIMAL(12,2),
    "price_gst_pct" DECIMAL(7,2),
    "price_gst_amount" DECIMAL(12,2),
    "price_net_amount" DECIMAL(12,2),
    "price_total_amount" DECIMAL(12,2),
    "vendor_id" UUID,
    "vendor_name" TEXT,
    "vendor_gross_amount" DECIMAL(12,2),
    "vendor_fuel_levy_pct" DECIMAL(7,2),
    "vendor_fuel_levy_amount" DECIMAL(12,2),
    "vendor_gst_pct" DECIMAL(7,2),
    "vendor_gst_amount" DECIMAL(12,2),
    "vendor_net_amount" DECIMAL(12,2),
    "vendor_total_amount" DECIMAL(12,2),
    "created_by_admin_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_stops" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "type" "booking_stop_type" NOT NULL,
    "position" INTEGER NOT NULL,
    "client_job_number" TEXT,
    "trailer" TEXT,
    "scheduled_at" TEXT,
    "company" TEXT,
    "address" TEXT,
    "city" TEXT,
    "suburb" TEXT,
    "state" TEXT,
    "country" TEXT,
    "instructions" TEXT,

    CONSTRAINT "booking_stops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_lanes" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "trailer" TEXT,
    "lane" TEXT,

    CONSTRAINT "booking_lanes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bookings_job_number_key" ON "bookings"("job_number");

-- CreateIndex
CREATE INDEX "bookings_customer_id_idx" ON "bookings"("customer_id");

-- CreateIndex
CREATE INDEX "bookings_vendor_id_idx" ON "bookings"("vendor_id");

-- CreateIndex
CREATE INDEX "bookings_financial_year_idx" ON "bookings"("financial_year");

-- CreateIndex
CREATE INDEX "booking_stops_booking_id_idx" ON "booking_stops"("booking_id");

-- CreateIndex
CREATE INDEX "booking_lanes_booking_id_idx" ON "booking_lanes"("booking_id");

-- AddForeignKey
ALTER TABLE "booking_stops" ADD CONSTRAINT "booking_stops_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_lanes" ADD CONSTRAINT "booking_lanes_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
