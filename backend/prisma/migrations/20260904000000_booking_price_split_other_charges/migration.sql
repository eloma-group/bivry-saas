-- A split charge and other charges on Our Price, and GST on all of it.
--
-- Our Price took a gross, a fuel levy and a GST rate, and charged GST on the
-- gross alone. Two charges were being agreed with customers that the form had
-- nowhere to put - a split charge and a catch all for anything else - and both
-- are part of the fare, so both are part of what GST is due on. They are asked
-- for the way the levy is, as a rate on the gross, and the amount each comes to
-- is stored beside it.
--
-- The GST rate itself is no longer typed. It has been 10% since 2000, asking
-- for it every time only invited a booking going out at 0%, and the column
-- stays so a saved booking still says what it charged.
--
-- Every column starts empty. A booking already stored was quoted without these
-- charges, and a null reads correctly as "none was charged" - it is not the
-- same as a zero somebody entered.

-- AlterTable
ALTER TABLE "booking_prices"
  ADD COLUMN "split_charge_pct" DECIMAL(7,2),
  ADD COLUMN "split_charge_amount" DECIMAL(12,2),
  ADD COLUMN "other_charges_pct" DECIMAL(7,2),
  ADD COLUMN "other_charges_amount" DECIMAL(12,2);
