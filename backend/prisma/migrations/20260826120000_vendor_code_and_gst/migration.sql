-- The vendor reference moves to `vendor_code`, and the register's GST line
-- gets a column.
--
-- The reference is copied rather than renamed. `supplier_id` held the same
-- BIVRY-5000 values all along and only the word changed, but a rename is not
-- something the deployed build survives: migrations run ahead of the app, so
-- between this landing and the new package going live the old code would be
-- selecting a column that no longer exists. Copying leaves both columns
-- readable, which is the same arrangement `trading_name` is already in.
--
-- Drop `supplier_id` and its index once no deployed build reads them.
ALTER TABLE "vendors" ADD COLUMN "vendor_code" TEXT;

UPDATE "vendors" SET "vendor_code" = "supplier_id" WHERE "supplier_id" IS NOT NULL;

CREATE UNIQUE INDEX "vendors_vendor_code_key" ON "vendors"("vendor_code");

-- What the Business Register says about GST: "Registered from 01 Jul 2000", or
-- "Not registered". Filled by the ABN lookup and editable afterwards, so it is
-- plain text rather than a flag and a date.
ALTER TABLE "vendors" ADD COLUMN "gst" TEXT;
