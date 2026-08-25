-- Yards get a table of their own rather than a flag on `vendor_warehouses`.
-- A yard is a site the supplier parks or stages at, not somewhere freight is
-- collected from or delivered to, and a deployed build from before this change
-- reads `vendor_warehouses` without knowing about the difference. Kept apart,
-- that build simply does not see yards; folded in, it would show every yard as
-- a warehouse for as long as the rollout takes.

-- CreateTable
CREATE TABLE "vendor_yards" (
    "id" UUID NOT NULL,
    "vendor_id" UUID NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "street1" TEXT,
    "street2" TEXT,
    "suburb" TEXT,
    "state" TEXT,
    "country" TEXT,
    "post_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_yards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "vendor_yards_vendor_id_idx" ON "vendor_yards"("vendor_id");

-- AddForeignKey
ALTER TABLE "vendor_yards" ADD CONSTRAINT "vendor_yards_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
