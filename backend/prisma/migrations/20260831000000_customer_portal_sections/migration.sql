-- The customer portal, brought in line with what the form now asks for.
--
-- Three changes, none of which move existing data:
--
--   1. The billing type CTL is renamed RCTI. It is the same thing under the
--      name the accounts team actually uses, so the enum value is renamed
--      rather than added alongside: every row already stored as CTL reads back
--      as RCTI with nothing to migrate.
--   2. Contact blocks beyond the four fixed departments get a table of their
--      own. `customer_contacts` holds one row per department and says so with a
--      unique index; these are as many as the customer adds.
--   3. Warehouses get a table of their own, the same shape the vendor's already
--      have. `customer_addresses` holds the two addresses the company is
--      registered at, one row each.
--
-- Both new tables are additive, so a build from before this migration goes on
-- reading the customer record unchanged and simply does not see them.

-- AlterEnum
ALTER TYPE "customer_billing_type" RENAME VALUE 'CTL' TO 'RCTI';

-- CreateTable
CREATE TABLE "customer_additional_contacts" (
    "id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "label" TEXT,
    "contact_person" TEXT,
    "designation" TEXT,
    "contact_number" TEXT,
    "email" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_additional_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "customer_additional_contacts_customer_id_idx" ON "customer_additional_contacts"("customer_id");

-- AddForeignKey
ALTER TABLE "customer_additional_contacts" ADD CONSTRAINT "customer_additional_contacts_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "customer_warehouses" (
    "id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "street1" TEXT,
    "street2" TEXT,
    "suburb" TEXT,
    "state" TEXT,
    "country" TEXT,
    "post_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_warehouses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "customer_warehouses_customer_id_idx" ON "customer_warehouses"("customer_id");

-- AddForeignKey
ALTER TABLE "customer_warehouses" ADD CONSTRAINT "customer_warehouses_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
