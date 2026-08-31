-- How many days a booking's invoice runs for.
--
-- A count of days rather than a term worded in prose, so the column is an
-- integer and the form takes digits only. Nullable, so a booking raised before
-- this migration simply carries no term, and a build from before it goes on
-- reading the table unchanged.

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN "invoice_term" INTEGER;
