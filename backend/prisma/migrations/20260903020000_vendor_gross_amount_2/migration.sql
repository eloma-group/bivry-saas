-- The vendor's gross for a second trailer.
--
-- The vendor grid asked for one gross, and everything under it - the fuel levy
-- amount, the GST amount, the net and the total - was worked out from that one
-- figure. A load split across two trailers is quoted as two, and adding them up
-- by hand before typing loses which trailer carried what, so the grid now asks
-- for a gross per trailer and derives the rest from their sum.
--
-- Our own price still takes a single gross for the whole job, which is why
-- there is no matching column for it here. The column starts empty: every
-- booking already stored was quoted as one figure, and that figure is still in
-- vendor_gross_amount, which is now trailer A, so a null here reads correctly
-- as "there was no second trailer".

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN "vendor_gross_amount_2" DECIMAL(12,2);
