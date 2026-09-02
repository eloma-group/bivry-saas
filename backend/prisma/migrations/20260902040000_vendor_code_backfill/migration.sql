-- Gives a vendor ID to every vendor that has none.
--
-- The code used to be handed out only when a vendor first opened their own
-- onboarding form, so a vendor an admin created and a vendor who never opened
-- the form both went without one and showed as blank wherever the ID is quoted.
-- The server now allocates on create as well; this catches up the ones already
-- in the table.
--
-- Numbering carries on from the highest BIVRY- code already taken, so nobody
-- who holds one is renumbered, and the order is by creation so the oldest
-- vendor gets the lowest number.
WITH highest AS (
  SELECT COALESCE(
           MAX(NULLIF(regexp_replace(vendor_code, '\D', '', 'g'), '')::bigint),
           4999
         ) AS taken
    FROM vendors
   WHERE vendor_code IS NOT NULL
), numbered AS (
  SELECT v.id,
         GREATEST(highest.taken, 4999) + ROW_NUMBER() OVER (ORDER BY v.created_at, v.id) AS position
    FROM vendors v
    CROSS JOIN highest
   WHERE v.vendor_code IS NULL
)
UPDATE vendors
   SET vendor_code = 'BIVRY-' || numbered.position
  FROM numbered
 WHERE vendors.id = numbered.id;
