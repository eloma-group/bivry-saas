-- Drops the eight columns that were kept alive for one release.
--
-- Each was left in place because migrations run ahead of the app: a column
-- removed in the same breath as the code that read it is a column the deployed
-- build is still selecting. The build that reads them has now been replaced
-- (3e88813, live 2026-08-26), so this is the other half of those renames.
--
-- Seven hold nothing that is not also held elsewhere:
--
--   vendors.supplier_id            copied to vendor_code
--   vendors.trading_name           first entry of trading_names
--   vendor_directors.designation   superseded by name
--   vendor_accreditations
--     .basic_fatigue_expiry        no longer asked for
--   drivers.nationality            copied to country
--
-- The three invoice columns are the exception: they hold answers with no
-- replacement, because the form stopped asking for invoice preferences
-- altogether. Dropped deliberately - nothing in the product collects or shows
-- them, so the answers were unreachable either way.
ALTER TABLE "vendors"
  DROP COLUMN "supplier_id",
  DROP COLUMN "trading_name",
  DROP COLUMN "invoice_preference",
  DROP COLUMN "invoice_emails",
  DROP COLUMN "invoice_other";

ALTER TABLE "vendor_directors" DROP COLUMN "designation";

ALTER TABLE "vendor_accreditations" DROP COLUMN "basic_fatigue_expiry";

ALTER TABLE "drivers" DROP COLUMN "nationality";
