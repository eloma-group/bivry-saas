-- `nationality` renamed to `country`, which is what it always held.
--
-- The column offered a list of countries and stored one of them: "Australia",
-- not "Australian". Nationality is the other word, and calling the column that
-- meant every reader had to know it did not mean it.
--
-- Copied rather than renamed. A rename is not something the deployed build
-- survives: migrations run ahead of the app, so between this landing and the
-- new package going live the old code would be selecting a column that is no
-- longer there. Both stay readable, and both stay written, until no deployed
-- build reads the old one - the same arrangement `trading_name` is in.
ALTER TABLE "drivers" ADD COLUMN "country" TEXT;

UPDATE "drivers" SET "country" = "nationality" WHERE "nationality" IS NOT NULL;
