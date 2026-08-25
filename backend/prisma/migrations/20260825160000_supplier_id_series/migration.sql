-- Renumbers every supplier reference onto the BIVRY-5000 series.
--
-- The order is taken from the number each supplier already holds, so whoever
-- was first stays first and the sequence has no gaps. Soft deleted suppliers
-- are renumbered too: their reference still occupies the unique index, and
-- skipping them would leave holes that the generator would later fill.
--
-- Only the digits of the old reference are read, never its prefix, so this
-- lands on the same answer whatever the references looked like going in and
-- can be run again without shifting anybody.
WITH renumbered AS (
  SELECT id,
         5000 + (
           ROW_NUMBER() OVER (
             ORDER BY
               NULLIF(regexp_replace(supplier_id, '\D', '', 'g'), '')::bigint NULLS LAST,
               created_at,
               id
           ) - 1
         ) AS position
    FROM vendors
   WHERE supplier_id IS NOT NULL
)
UPDATE vendors
   SET supplier_id = 'BIVRY-' || renumbered.position
  FROM renumbered
 WHERE vendors.id = renumbered.id;
