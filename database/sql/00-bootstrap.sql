-- ---------------------------------------------------------------------------
-- BIVRY SaaS - one time database bootstrap
--
-- Run this ONCE against the `postgres` database on the Azure Flexible Server,
-- as the server admin, before the first `prisma migrate deploy`.
--
--   psql "host=<server>.postgres.database.azure.com port=5432 dbname=postgres \
--         user=<admin> sslmode=require" -f 00-bootstrap.sql
--
-- After this, everything else is done by Prisma migrations. Do not create
-- tables by hand.
-- ---------------------------------------------------------------------------

-- The application database. Azure Flexible Server ships with `postgres` and
-- `azure_maintenance`; the app gets its own.
CREATE DATABASE bivry
  WITH ENCODING 'UTF8'
       LC_COLLATE 'en_US.utf8'
       LC_CTYPE   'en_US.utf8';

COMMENT ON DATABASE bivry IS 'BIVRY fleet SaaS - application database';

-- ---------------------------------------------------------------------------
-- Everything below runs INSIDE the bivry database.
-- Reconnect first:  \c bivry
-- ---------------------------------------------------------------------------
\c bivry

-- gen_random_uuid() for any hand written SQL. Prisma itself generates uuids in
-- the application layer, so this is a convenience rather than a requirement.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Case insensitive email comparison is done in the application layer (emails are
-- lower cased before every write and every lookup), so no citext is needed.

-- ---------------------------------------------------------------------------
-- Least privilege application role.
--
-- The admin login is only for migrations and emergencies. The running API
-- connects as `bivry_app`, which can read and write data but cannot drop
-- tables. Set a strong password and put it in the App Service DATABASE_URL.
-- ---------------------------------------------------------------------------

-- CREATE ROLE bivry_app WITH LOGIN PASSWORD 'REPLACE_WITH_A_STRONG_PASSWORD';
-- GRANT CONNECT ON DATABASE bivry TO bivry_app;
-- GRANT USAGE ON SCHEMA public TO bivry_app;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO bivry_app;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO bivry_app;
--
-- Applies the same grants to tables created by future migrations:
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public
--   GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO bivry_app;
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public
--   GRANT USAGE, SELECT ON SEQUENCES TO bivry_app;
--
-- Run these AFTER the first `prisma migrate deploy`, because the tables have to
-- exist before they can be granted. Keep migrations running as the admin user.
