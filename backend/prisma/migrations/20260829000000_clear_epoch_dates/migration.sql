-- Clears the 1970-01-01 dates the blank-date save bug left behind.
--
-- An empty optional date sent as null was coerced by `new Date(null)` into the
-- Unix epoch, so blank accreditation, insurance and driver document dates were
-- stored as 1970-01-01 and read as "Expired 20693d ago". The save path itself
-- was fixed in the validators; this clears what had already been written, so a
-- masked badge is no longer the only thing making those records look right.
--
-- Every DATE column in the schema is listed below EXCEPT drivers.date_of_birth.
-- A driver really can have been born on 1 January 1970, and nothing in the row
-- tells a real date of birth apart from a blank that was coerced into one, so
-- those are left alone rather than guessed at. To see which drivers hold one:
--
--   SELECT id, first_name, last_name, email FROM drivers
--   WHERE date_of_birth = DATE '1970-01-01';
--
-- Each statement is written out rather than looped, so what this migration
-- touches can be read straight off the file.

UPDATE "vendor_accreditations" SET "expiry_date" = NULL WHERE "expiry_date" = DATE '1970-01-01';
UPDATE "vendor_accreditations" SET "mass_management_expiry" = NULL WHERE "mass_management_expiry" = DATE '1970-01-01';
UPDATE "vendor_accreditations" SET "dangerous_goods_expiry" = NULL WHERE "dangerous_goods_expiry" = DATE '1970-01-01';
UPDATE "vendor_accreditations" SET "nhvas_expiry" = NULL WHERE "nhvas_expiry" = DATE '1970-01-01';
UPDATE "vendor_accreditations" SET "haccp_expiry" = NULL WHERE "haccp_expiry" = DATE '1970-01-01';

UPDATE "vendor_insurances" SET "issue_date" = NULL WHERE "issue_date" = DATE '1970-01-01';
UPDATE "vendor_insurances" SET "expiry_date" = NULL WHERE "expiry_date" = DATE '1970-01-01';
UPDATE "vendor_insurances" SET "valid_from" = NULL WHERE "valid_from" = DATE '1970-01-01';
UPDATE "vendor_insurances" SET "valid_till" = NULL WHERE "valid_till" = DATE '1970-01-01';

UPDATE "vendor_documents" SET "issue_date" = NULL WHERE "issue_date" = DATE '1970-01-01';
UPDATE "vendor_documents" SET "expiry_date" = NULL WHERE "expiry_date" = DATE '1970-01-01';

UPDATE "driver_licences" SET "expiry_date" = NULL WHERE "expiry_date" = DATE '1970-01-01';

UPDATE "driver_driving_histories" SET "issue_date" = NULL WHERE "issue_date" = DATE '1970-01-01';
UPDATE "driver_driving_histories" SET "expiry_date" = NULL WHERE "expiry_date" = DATE '1970-01-01';

UPDATE "driver_police_verifications" SET "issue_date" = NULL WHERE "issue_date" = DATE '1970-01-01';
UPDATE "driver_police_verifications" SET "expiry_date" = NULL WHERE "expiry_date" = DATE '1970-01-01';

UPDATE "driver_visas" SET "expiry_date" = NULL WHERE "expiry_date" = DATE '1970-01-01';

UPDATE "driver_medicals" SET "issue_date" = NULL WHERE "issue_date" = DATE '1970-01-01';
UPDATE "driver_medicals" SET "expiry_date" = NULL WHERE "expiry_date" = DATE '1970-01-01';

UPDATE "driver_drug_tests" SET "issue_date" = NULL WHERE "issue_date" = DATE '1970-01-01';
UPDATE "driver_drug_tests" SET "expiry_date" = NULL WHERE "expiry_date" = DATE '1970-01-01';

UPDATE "driver_passports" SET "expiry_date" = NULL WHERE "expiry_date" = DATE '1970-01-01';

UPDATE "driver_medicares" SET "expiry_date" = NULL WHERE "expiry_date" = DATE '1970-01-01';

UPDATE "driver_documents" SET "expiry_date" = NULL WHERE "expiry_date" = DATE '1970-01-01';
