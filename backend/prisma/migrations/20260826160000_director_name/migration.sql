-- A director is now named rather than titled: the form asks who they are
-- instead of what their role in the company is called.
--
-- Additive. `designation` keeps whatever it holds and is still selectable, so
-- a deployed build from before this reads the directors it always did. Nothing
-- backfills the new column - a name is not derivable from a job title, so it
-- stays empty until somebody fills it in.
ALTER TABLE "vendor_directors" ADD COLUMN "name" TEXT;
