-- A booking's pickup and delivery addresses, in the shape every other address
-- in the product already uses.
--
-- A stop used to hold a free `address` line and a `city` alongside the suburb,
-- state and country, which asked for the same address twice: the line repeated
-- what the fields underneath it already said, and "city" and "suburb" are the
-- same thing in an Australian address. The customer form's Address Information
-- block is the settled shape - suite, street 1, suburb, state, post code,
-- country - so a stop takes that instead.
--
-- `address` becomes `street1`: whatever was typed on that line was the street,
-- so it is kept rather than dropped. `city` goes, and `post_code` is new and
-- starts empty - a post code was never asked for, so there is nothing to carry
-- over into it.

-- AlterTable
ALTER TABLE "booking_stops" RENAME COLUMN "address" TO "street1";

ALTER TABLE "booking_stops" DROP COLUMN "city";

ALTER TABLE "booking_stops" ADD COLUMN "post_code" TEXT;
