-- CreateEnum
CREATE TYPE "vendor_contact_type" AS ENUM ('OPERATIONS', 'COMPLIANCE', 'ADMIN', 'DISPATCH');

-- CreateEnum
CREATE TYPE "vendor_insurance_type" AS ENUM ('PRODUCT_LIABILITY', 'PUBLIC_LIABILITY', 'WORK_COVER', 'MARINE_GENERAL', 'MARINE_ALCOHOL', 'COC');

-- CreateEnum
CREATE TYPE "vendor_document_type" AS ENUM ('COMPANY_LOGO', 'ACCREDITATION', 'INSURANCE_PRODUCT_LIABILITY', 'INSURANCE_PUBLIC_LIABILITY', 'INSURANCE_WORK_COVER', 'INSURANCE_MARINE_GENERAL', 'INSURANCE_MARINE_ALCOHOL', 'INSURANCE_COC', 'COMPLIANCE_DRUG', 'COMPLIANCE_ALCOHOL_POLICY', 'COMPLIANCE_PROCEDURE', 'COMPLIANCE_RISK_MANAGEMENT', 'COMPLIANCE_SPEED_POLICY', 'COMPLIANCE_FATIGUE_POLICY', 'COMPLIANCE_GPS_SNAPSHOT', 'COMPLIANCE_WHS_POLICY', 'COMPLIANCE_ADDITIONAL');

-- AlterTable
ALTER TABLE "vendors" ADD COLUMN     "approved_at" TIMESTAMP(3),
ADD COLUMN     "invoice_emails" TEXT[],
ADD COLUMN     "invoice_other" TEXT,
ADD COLUMN     "invoice_preference" TEXT,
ADD COLUMN     "legal_name" TEXT,
ADD COLUMN     "onboarding_status" "onboarding_status" NOT NULL DEFAULT 'NOT_STARTED',
ADD COLUMN     "onboarding_step" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "rejection_reason" TEXT,
ADD COLUMN     "submitted_at" TIMESTAMP(3),
ADD COLUMN     "supplier_id" TEXT,
ADD COLUMN     "trading_name" TEXT,
ADD COLUMN     "website_address" TEXT;

-- CreateTable
CREATE TABLE "vendor_contacts" (
    "id" UUID NOT NULL,
    "vendor_id" UUID NOT NULL,
    "type" "vendor_contact_type" NOT NULL,
    "contact_person" TEXT,
    "designation" TEXT,
    "contact_number" TEXT,
    "email" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_directors" (
    "id" UUID NOT NULL,
    "vendor_id" UUID NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "designation" TEXT,
    "email" TEXT,
    "contact_number" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_directors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_bank_details" (
    "id" UUID NOT NULL,
    "vendor_id" UUID NOT NULL,
    "account_name" TEXT,
    "bank_name" TEXT,
    "bsb" TEXT,
    "account_number" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_bank_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_coverages" (
    "id" UUID NOT NULL,
    "vendor_id" UUID NOT NULL,
    "areas_covered" TEXT[],
    "business_operations" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_coverages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_warehouses" (
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

    CONSTRAINT "vendor_warehouses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_accreditations" (
    "id" UUID NOT NULL,
    "vendor_id" UUID NOT NULL,
    "accreditation_number" TEXT,
    "mass_management_expiry" DATE,
    "basic_fatigue_expiry" DATE,
    "dangerous_goods_expiry" DATE,
    "nhvas_expiry" DATE,
    "haccp_expiry" DATE,
    "verification_status" "verification_status" NOT NULL DEFAULT 'PENDING',
    "verified_at" TIMESTAMP(3),
    "verified_by" UUID,
    "remarks" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_accreditations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_insurances" (
    "id" UUID NOT NULL,
    "vendor_id" UUID NOT NULL,
    "type" "vendor_insurance_type" NOT NULL,
    "policy_number" TEXT,
    "insurer" TEXT,
    "expiry_date" DATE,
    "sum_assured" TEXT,
    "employer_number" TEXT,
    "valid_from" DATE,
    "valid_till" DATE,
    "due_in_days" INTEGER,
    "verification_status" "verification_status" NOT NULL DEFAULT 'PENDING',
    "verified_at" TIMESTAMP(3),
    "verified_by" UUID,
    "remarks" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_insurances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_documents" (
    "id" UUID NOT NULL,
    "vendor_id" UUID NOT NULL,
    "doc_type" "vendor_document_type" NOT NULL,
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

    CONSTRAINT "vendor_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vendor_contacts_vendor_id_type_key" ON "vendor_contacts"("vendor_id", "type");

-- CreateIndex
CREATE INDEX "vendor_directors_vendor_id_idx" ON "vendor_directors"("vendor_id");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_bank_details_vendor_id_key" ON "vendor_bank_details"("vendor_id");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_coverages_vendor_id_key" ON "vendor_coverages"("vendor_id");

-- CreateIndex
CREATE INDEX "vendor_warehouses_vendor_id_idx" ON "vendor_warehouses"("vendor_id");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_accreditations_vendor_id_key" ON "vendor_accreditations"("vendor_id");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_insurances_vendor_id_type_key" ON "vendor_insurances"("vendor_id", "type");

-- CreateIndex
CREATE INDEX "vendor_documents_vendor_id_doc_type_idx" ON "vendor_documents"("vendor_id", "doc_type");

-- CreateIndex
CREATE UNIQUE INDEX "vendors_supplier_id_key" ON "vendors"("supplier_id");

-- CreateIndex
CREATE INDEX "vendors_onboarding_status_idx" ON "vendors"("onboarding_status");

-- AddForeignKey
ALTER TABLE "vendor_contacts" ADD CONSTRAINT "vendor_contacts_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_directors" ADD CONSTRAINT "vendor_directors_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_bank_details" ADD CONSTRAINT "vendor_bank_details_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_coverages" ADD CONSTRAINT "vendor_coverages_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_warehouses" ADD CONSTRAINT "vendor_warehouses_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_accreditations" ADD CONSTRAINT "vendor_accreditations_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_insurances" ADD CONSTRAINT "vendor_insurances_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_documents" ADD CONSTRAINT "vendor_documents_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

