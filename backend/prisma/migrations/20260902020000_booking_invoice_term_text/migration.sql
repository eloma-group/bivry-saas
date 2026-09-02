-- The invoice term, as a term rather than a count of days.
--
-- It was an integer, so a booking could only ever say "7". The customer record
-- holds the term the accounts team actually agreed - "Net 7" - and the booking
-- form now fills itself from it and stays editable, so the column has to hold
-- whatever an admin words it as. Every stored count keeps its own reading: 7
-- becomes "7", which is still true.

-- AlterTable
ALTER TABLE "bookings"
  ALTER COLUMN "invoice_term" TYPE TEXT USING "invoice_term"::text;
