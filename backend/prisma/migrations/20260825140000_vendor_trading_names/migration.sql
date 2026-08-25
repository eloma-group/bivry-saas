-- AlterTable
ALTER TABLE "vendors" ADD COLUMN "trading_names" TEXT[];

-- The single trading name each supplier already gave becomes the first entry of
-- the list, so nothing typed before this change is lost.
UPDATE "vendors"
   SET "trading_names" = ARRAY["trading_name"]
 WHERE "trading_name" IS NOT NULL
   AND btrim("trading_name") <> '';

-- `trading_name` deliberately stays. Migrations run before the new build is
-- deployed, and again on a rollback to the previous build, so a column the
-- running app still reads cannot be dropped in the same step that stops writing
-- it. It is kept in step from here (see legacyTradingName in vendor.service) and
-- comes out in a later migration, once no deployed build reads it.
