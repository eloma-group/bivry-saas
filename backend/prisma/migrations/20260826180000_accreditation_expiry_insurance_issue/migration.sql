-- Two dates the form started asking for.
--
-- The accreditation now carries an expiry of its own, separate from the scheme
-- expiry dates that each belong to one module of it, and every insurance policy
-- carries the date it was issued alongside its expiry.
--
-- Additive, and nothing is backfilled: neither date is derivable from what is
-- already stored. `basic_fatigue_expiry` is left exactly as it is - the form
-- stopped asking for it, but a deployed build from before that still selects
-- it, and it holds what vendors already answered.
ALTER TABLE "vendor_accreditations" ADD COLUMN "expiry_date" DATE;
ALTER TABLE "vendor_insurances" ADD COLUMN "issue_date" DATE;
