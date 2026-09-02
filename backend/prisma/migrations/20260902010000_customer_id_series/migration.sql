-- Renumbers every customer reference onto the BIVCST5000 series.
--
-- The references used to read CUST-3000 onwards. The order is taken from the
-- number each customer already holds, so whoever was first stays first and the
-- sequence has no gaps. Soft deleted customers are renumbered too: their
-- reference still occupies the unique index, and skipping them would leave
-- holes that the generator would later fill.
--
-- Only the digits of the old reference are read, never its prefix, so this
-- lands on the same answer whatever the references looked like going in and can
-- be run again without shifting anybody.
WITH renumbered AS (
  SELECT id,
         5000 + (
           ROW_NUMBER() OVER (
             ORDER BY
               NULLIF(regexp_replace(cid, '\D', '', 'g'), '')::bigint NULLS LAST,
               created_at,
               id
           ) - 1
         ) AS position
    FROM customers
   WHERE cid IS NOT NULL
)
UPDATE customers
   SET cid = 'BIVCST' || renumbered.position
  FROM renumbered
 WHERE customers.id = renumbered.id;
