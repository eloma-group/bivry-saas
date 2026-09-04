-- The pickups and the vendors we run often enough to keep on file.
--
-- Create Booking asks for the same handful of customers and vendors most days,
-- and every one of them was being typed out again: the address, the trailer,
-- the agreement type and the price. These two tables hold that once, so the
-- form is picked from rather than filled in.
--
-- permanent_customers is one row per place a customer loads from, not one per
-- customer. Amazon loads from Cranbourne West, Craigieburn and Kemps Creek,
-- each with its own address and its own price, so the site is carried in
-- pick_up_company ("Amazon - AVV2 - Cranbourne West") and that name is what the
-- booking form searches. It is unique because two rows under one name would be
-- two answers to the question the form asks.
--
-- permanent_vendors is one row per vendor, because we agree one set of figures
-- with a vendor for the work rather than one per site. It hangs off the vendor
-- record itself and goes when the vendor does.
--
-- Both carry their own job reference, BIVRY-CJOB-5000 and BIVRY-VJOB-5000,
-- handed out by the server on create and never changed after.

-- CreateTable
CREATE TABLE "permanent_customers" (
    "id" UUID NOT NULL,
    "client_job_id" TEXT NOT NULL,
    "pick_up_company" TEXT NOT NULL,
    "agreement_type" TEXT,
    "reference" TEXT,
    "trailer" TEXT,
    "suite" TEXT,
    "street_1" TEXT,
    "suburb" TEXT,
    "state" TEXT,
    "post_code" TEXT,
    "country" TEXT,
    "full_address" TEXT,
    "gross_amount" DECIMAL(12,2),
    "fuel_levy_pct" DECIMAL(7,2),
    "fuel_levy_amount" DECIMAL(12,2),
    "split_charge_pct" DECIMAL(7,2),
    "split_charge_amount" DECIMAL(12,2),
    "other_charges_pct" DECIMAL(7,2),
    "other_charges_amount" DECIMAL(12,2),
    "gst_pct" DECIMAL(7,2),
    "gst_amount" DECIMAL(12,2),
    "net_amount" DECIMAL(12,2),
    "total_amount" DECIMAL(12,2),
    "final_amount" DECIMAL(12,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "permanent_customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permanent_vendors" (
    "id" UUID NOT NULL,
    "vendor_job_id" TEXT NOT NULL,
    "vendor_id" UUID NOT NULL,
    "vendor_name" TEXT,
    "gross_amount" DECIMAL(12,2),
    "gross_amount_2" DECIMAL(12,2),
    "fuel_levy_pct" DECIMAL(7,2),
    "fuel_levy_amount" DECIMAL(12,2),
    "gst_pct" DECIMAL(7,2),
    "gst_amount" DECIMAL(12,2),
    "net_amount" DECIMAL(12,2),
    "total_amount" DECIMAL(12,2),
    "suite" TEXT,
    "street_1" TEXT,
    "suburb" TEXT,
    "state" TEXT,
    "post_code" TEXT,
    "country" TEXT,
    "full_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "permanent_vendors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "permanent_customers_client_job_id_key" ON "permanent_customers"("client_job_id");

-- CreateIndex
CREATE UNIQUE INDEX "permanent_customers_pick_up_company_key" ON "permanent_customers"("pick_up_company");

-- CreateIndex
CREATE INDEX "permanent_customers_pick_up_company_idx" ON "permanent_customers"("pick_up_company");

-- CreateIndex
CREATE UNIQUE INDEX "permanent_vendors_vendor_job_id_key" ON "permanent_vendors"("vendor_job_id");

-- CreateIndex
CREATE UNIQUE INDEX "permanent_vendors_vendor_id_key" ON "permanent_vendors"("vendor_id");

-- AddForeignKey
ALTER TABLE "permanent_vendors" ADD CONSTRAINT "permanent_vendors_vendor_id_fkey"
  FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
