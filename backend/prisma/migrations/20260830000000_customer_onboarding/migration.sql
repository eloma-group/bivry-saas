-- The customer onboarding record.
--
-- A customer used to be a plain account: an email, a name and a company. This
-- gives it the same shape a vendor already has - company details, contacts,
-- directors, the two registered addresses, billing terms and its own document
-- store - so the Customer module can be filled in, saved as a draft and
-- reviewed the same way the Vendor one is.
--
-- Everything added to `customers` is nullable or defaulted, so a build from
-- before this migration goes on reading the table unchanged.

-- CreateEnum
CREATE TYPE "customer_contact_type" AS ENUM ('MAIN', 'OPERATIONS', 'ACCOUNTS', 'DISPATCH');

-- CreateEnum
CREATE TYPE "customer_address_type" AS ENUM ('PRINCIPAL', 'BILLING');

-- CreateEnum
CREATE TYPE "customer_billing_type" AS ENUM ('INVOICING', 'CTL');

-- CreateEnum
CREATE TYPE "customer_document_type" AS ENUM ('COMPANY_LOGO', 'CONTRACT', 'ADDITIONAL');

-- AlterTable
ALTER TABLE "customers"
  ADD COLUMN "cid" TEXT,
  ADD COLUMN "designation" TEXT,
  ADD COLUMN "trading_names" TEXT[],
  ADD COLUMN "legal_name" TEXT,
  ADD COLUMN "abn" TEXT,
  ADD COLUMN "acn" TEXT,
  ADD COLUMN "abn_status" TEXT,
  ADD COLUMN "entity_type" TEXT,
  ADD COLUMN "gst" TEXT,
  ADD COLUMN "website_address" TEXT,
  ADD COLUMN "creation_date" DATE,
  ADD COLUMN "logo_url" TEXT,
  ADD COLUMN "billing_same_as_principal" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "onboarding_status" "onboarding_status" NOT NULL DEFAULT 'NOT_STARTED',
  ADD COLUMN "onboarding_step" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "submitted_at" TIMESTAMP(3),
  ADD COLUMN "approved_at" TIMESTAMP(3),
  ADD COLUMN "rejection_reason" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "customers_cid_key" ON "customers"("cid");

-- CreateIndex
CREATE INDEX "customers_onboarding_status_idx" ON "customers"("onboarding_status");

-- CreateTable
CREATE TABLE "customer_contacts" (
    "id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "type" "customer_contact_type" NOT NULL,
    "contact_person" TEXT,
    "designation" TEXT,
    "contact_number" TEXT,
    "email" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "customer_contacts_customer_id_type_key" ON "customer_contacts"("customer_id", "type");

-- CreateTable
CREATE TABLE "customer_directors" (
    "id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "name" TEXT,
    "designation" TEXT,
    "email" TEXT,
    "contact_number" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_directors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "customer_directors_customer_id_idx" ON "customer_directors"("customer_id");

-- CreateTable
CREATE TABLE "customer_addresses" (
    "id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "type" "customer_address_type" NOT NULL,
    "street1" TEXT,
    "street2" TEXT,
    "suburb" TEXT,
    "state" TEXT,
    "country" TEXT,
    "post_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "customer_addresses_customer_id_type_key" ON "customer_addresses"("customer_id", "type");

-- CreateTable
CREATE TABLE "customer_billings" (
    "id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "term" TEXT,
    "billing_type" "customer_billing_type",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_billings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "customer_billings_customer_id_key" ON "customer_billings"("customer_id");

-- CreateTable
CREATE TABLE "customer_documents" (
    "id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "doc_type" "customer_document_type" NOT NULL,
    "category" TEXT,
    "issue_date" DATE,
    "expiry_date" DATE,
    "file_name" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "storage_url" TEXT,
    "mime_type" TEXT NOT NULL,
    "size_in_bytes" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "customer_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "customer_documents_customer_id_doc_type_idx" ON "customer_documents"("customer_id", "doc_type");

-- AddForeignKey
ALTER TABLE "customer_contacts" ADD CONSTRAINT "customer_contacts_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_directors" ADD CONSTRAINT "customer_directors_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_addresses" ADD CONSTRAINT "customer_addresses_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_billings" ADD CONSTRAINT "customer_billings_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_documents" ADD CONSTRAINT "customer_documents_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
