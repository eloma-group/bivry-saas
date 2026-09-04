-- Sample rows for Permanent Data, so the page and the Create Booking autofill
-- can be tried on real looking records.
--
-- These are test data and are meant to be deleted once the feature has been
-- checked: five pickups taken from the customer list we already keep in a
-- spreadsheet, three Amazon sites and two Tesla, with prices made up to fill
-- every column. Deleting them from the Permanent Data page is all that is
-- needed; nothing depends on them.
--
-- The prices are worked out the way Our Price works them out, so a seeded row
-- and a row typed on the page read the same: GST is 10% of the gross plus the
-- fuel levy, split charge and other charges, the net is the gross plus GST, and
-- the total is the whole of it.

INSERT INTO "permanent_customers" (
  "id", "client_job_id", "pick_up_company", "agreement_type", "reference", "trailer",
  "suite", "street_1", "suburb", "state", "post_code", "country", "full_address",
  "gross_amount", "fuel_levy_pct", "fuel_levy_amount",
  "split_charge_pct", "split_charge_amount",
  "other_charges_pct", "other_charges_amount",
  "gst_pct", "gst_amount", "net_amount", "total_amount", "final_amount",
  "created_at", "updated_at"
)
VALUES
  (gen_random_uuid(), 'BIVRY-CJOB-5000', 'Amazon - AVV2 - Cranbourne West', 'Contract', 'Amazon', 'A',
   NULL, '95 Whitfield Boulevard', 'Cranbourne West', 'Victoria', '3977', 'Australia',
   '95 Whitfield Boulevard, Cranbourne West VIC 3977, Australia',
   1200.00, 5.00, 60.00, 10.00, 120.00, 2.50, 30.00, 10.00, 141.00, 1341.00, 1551.00, 1551.00,
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

  (gen_random_uuid(), 'BIVRY-CJOB-5001', 'Amazon - Mel 8 - Craigiburn', 'Permanent', 'Amazon', 'B',
   NULL, 'Amaroo Road', 'Craigieburn', 'Victoria', '3064', 'Australia',
   'Amaroo Road, Craigieburn VIC 3064, Australia',
   950.00, 6.00, 57.00, 0.00, 0.00, 5.00, 47.50, 10.00, 105.45, 1055.45, 1159.95, 1159.95,
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

  (gen_random_uuid(), 'BIVRY-CJOB-5002', 'Amazon - BWU2 - Kemps Creek', 'Contract', 'Amazon', 'Double-B',
   NULL, '13 Emporium Avenue', 'Kemps Creek', 'New South Wales', '2178', 'Australia',
   '13 Emporium Avenue, Kemps Creek NSW 2178, Australia',
   1450.00, 4.00, 58.00, 8.00, 116.00, 0.00, 0.00, 10.00, 162.40, 1612.40, 1786.40, 1786.40,
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

  (gen_random_uuid(), 'BIVRY-CJOB-5003', 'Tesla Truganina', 'Permanent', 'Tesla', 'A',
   '42', 'Amherst Drive', 'Truganina', 'Victoria', '3029', 'Australia',
   '42, Amherst Drive, Truganina VIC 3029, Australia',
   2100.00, 5.00, 105.00, 0.00, 0.00, 3.00, 63.00, 10.00, 226.80, 2326.80, 2494.80, 2494.80,
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

  (gen_random_uuid(), 'BIVRY-CJOB-5004', 'Tesla Truganina - Return MRL', 'Adhoc', 'Tesla', 'B',
   '42', 'Amherst Drive', 'Truganina', 'Victoria', '3029', 'Australia',
   '42, Amherst Drive, Truganina VIC 3029, Australia',
   1750.00, 5.00, 87.50, 12.00, 210.00, 0.00, 0.00, 10.00, 204.75, 1954.75, 2252.25, 2252.25,
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Two vendor prices, against whichever two vendors the database already holds.
-- Which two does not matter for a sample, and naming vendors by id here would
-- tie this migration to one database. A database with no vendors in it inserts
-- nothing at all, which is correct rather than an error.
WITH picked AS (
  SELECT "id", "company_name"
    FROM "vendors"
   WHERE "deleted_at" IS NULL
   ORDER BY "created_at"
   LIMIT 2
), numbered AS (
  SELECT "id", "company_name", ROW_NUMBER() OVER (ORDER BY "company_name")::int AS rn
    FROM picked
)
INSERT INTO "permanent_vendors" (
  "id", "vendor_job_id", "vendor_id", "vendor_name",
  "gross_amount", "gross_amount_2", "fuel_levy_pct", "fuel_levy_amount",
  "gst_pct", "gst_amount", "net_amount", "total_amount",
  "suite", "street_1", "suburb", "state", "post_code", "country", "full_address",
  "created_at", "updated_at"
)
SELECT
  gen_random_uuid(),
  'BIVRY-VJOB-' || (4999 + n.rn)::text,
  n."id",
  n."company_name",
  (ARRAY[1800.00, 2400.00])[n.rn],
  (ARRAY[1200.00, 0.00])[n.rn],
  (ARRAY[5.00, 6.00])[n.rn],
  (ARRAY[150.00, 144.00])[n.rn],
  10.00,
  (ARRAY[300.00, 240.00])[n.rn],
  (ARRAY[3300.00, 2640.00])[n.rn],
  (ARRAY[3450.00, 2784.00])[n.rn],
  NULL,
  (ARRAY['76 Paramount Boulevard', '7 Westlink Court'])[n.rn],
  (ARRAY['Derrimut', 'Altona'])[n.rn],
  'Victoria',
  (ARRAY['3026', '3018'])[n.rn],
  'Australia',
  (ARRAY[
    '76 Paramount Boulevard, Derrimut VIC 3026, Australia',
    '7 Westlink Court, Altona VIC 3018, Australia'
  ])[n.rn],
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM numbered n;
