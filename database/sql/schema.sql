-- ---------------------------------------------------------------------------
-- BIVRY SaaS - full PostgreSQL schema
--
-- GENERATED FILE. Do not edit by hand.
-- Source of truth: backend/prisma/schema.prisma
-- Regenerate with: npm run db:sql
--
-- This is the complete CREATE script for an empty database. Applying it by
-- hand is only for inspection or for a disaster recovery restore. The normal
-- path is `npx prisma migrate deploy`, which also records the migration in
-- the _prisma_migrations table.
-- ---------------------------------------------------------------------------
-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "actor_type" AS ENUM ('ADMIN', 'CUSTOMER', 'VENDOR', 'EMPLOYEE', 'DRIVER');

-- CreateEnum
CREATE TYPE "account_status" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED');

-- CreateEnum
CREATE TYPE "onboarding_status" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "verification_status" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "address_type" AS ENUM ('CURRENT', 'PERMANENT');

-- CreateEnum
CREATE TYPE "vendor_address_type" AS ENUM ('PRINCIPAL', 'BILLING');

-- CreateEnum
CREATE TYPE "licence_type" AS ENUM ('CAR', 'HEAVY_RIGID', 'HEAVY_COMBINATION', 'MULTI_COMBINATION', 'MOTORCYCLE');

-- CreateEnum
CREATE TYPE "driver_document_type" AS ENUM ('PROFILE_PHOTO', 'LICENCE_FRONT', 'LICENCE_BACK', 'DRIVING_HISTORY', 'POLICE_VERIFICATION', 'VISA', 'MEDICAL', 'DRUG_TEST', 'PASSPORT_FRONT', 'PASSPORT_BACK', 'MEDICARE', 'ADDITIONAL');

-- CreateEnum
CREATE TYPE "vendor_contact_type" AS ENUM ('OPERATIONS', 'COMPLIANCE', 'ADMIN', 'DISPATCH');

-- CreateEnum
CREATE TYPE "vendor_insurance_type" AS ENUM ('PRODUCT_LIABILITY', 'PUBLIC_LIABILITY', 'WORK_COVER', 'MARINE_GENERAL', 'MARINE_ALCOHOL', 'COC');

-- CreateEnum
CREATE TYPE "vendor_document_type" AS ENUM ('COMPANY_LOGO', 'ACCREDITATION', 'INSURANCE_PRODUCT_LIABILITY', 'INSURANCE_PUBLIC_LIABILITY', 'INSURANCE_WORK_COVER', 'INSURANCE_MARINE_GENERAL', 'INSURANCE_MARINE_ALCOHOL', 'INSURANCE_COC', 'COMPLIANCE_DRUG', 'COMPLIANCE_ALCOHOL_POLICY', 'COMPLIANCE_PROCEDURE', 'COMPLIANCE_RISK_MANAGEMENT', 'COMPLIANCE_SPEED_POLICY', 'COMPLIANCE_FATIGUE_POLICY', 'COMPLIANCE_GPS_SNAPSHOT', 'COMPLIANCE_WHS_POLICY', 'COMPLIANCE_ADDITIONAL');

-- CreateEnum
CREATE TYPE "customer_contact_type" AS ENUM ('MAIN', 'OPERATIONS', 'ACCOUNTS', 'DISPATCH');

-- CreateEnum
CREATE TYPE "customer_address_type" AS ENUM ('PRINCIPAL', 'BILLING');

-- CreateEnum
CREATE TYPE "customer_billing_type" AS ENUM ('INVOICING', 'RCTI');

-- CreateEnum
CREATE TYPE "customer_document_type" AS ENUM ('COMPANY_LOGO', 'CONTRACT', 'ADDITIONAL');

-- CreateEnum
CREATE TYPE "booking_stop_type" AS ENUM ('PICKUP', 'DELIVERY');

-- CreateTable
CREATE TABLE "admins" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "password_hash" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT,
    "avatar_url" TEXT,
    "is_super_admin" BOOLEAN NOT NULL DEFAULT false,
    "status" "account_status" NOT NULL DEFAULT 'ACTIVE',
    "email_verified_at" TIMESTAMP(3),
    "last_login_at" TIMESTAMP(3),
    "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "password_hash" TEXT NOT NULL,
    "account_number" TEXT,
    "cid" TEXT,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT,
    "company_name" TEXT,
    "designation" TEXT,
    "trading_names" TEXT[],
    "legal_name" TEXT,
    "abn" TEXT,
    "acn" TEXT,
    "abn_status" TEXT,
    "entity_type" TEXT,
    "gst" TEXT,
    "website_address" TEXT,
    "creation_date" DATE,
    "avatar_url" TEXT,
    "logo_url" TEXT,
    "billing_same_as_principal" BOOLEAN NOT NULL DEFAULT false,
    "status" "account_status" NOT NULL DEFAULT 'PENDING',
    "onboarding_status" "onboarding_status" NOT NULL DEFAULT 'NOT_STARTED',
    "onboarding_step" INTEGER NOT NULL DEFAULT 0,
    "submitted_at" TIMESTAMP(3),
    "approved_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "email_verified_at" TIMESTAMP(3),
    "last_login_at" TIMESTAMP(3),
    "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "customer_warehouses" (
    "id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "suite" TEXT,
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

-- CreateTable
CREATE TABLE "customer_addresses" (
    "id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "type" "customer_address_type" NOT NULL,
    "suite" TEXT,
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

-- CreateTable
CREATE TABLE "vendors" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "password_hash" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "contact_person" TEXT,
    "abn" TEXT,
    "acn" TEXT,
    "abn_status" TEXT,
    "entity_type" TEXT,
    "gst" TEXT,
    "logo_url" TEXT,
    "vendor_code" TEXT,
    "trading_names" TEXT[],
    "legal_name" TEXT,
    "website_address" TEXT,
    "billing_same_as_principal" BOOLEAN NOT NULL DEFAULT false,
    "status" "account_status" NOT NULL DEFAULT 'PENDING',
    "onboarding_status" "onboarding_status" NOT NULL DEFAULT 'NOT_STARTED',
    "onboarding_step" INTEGER NOT NULL DEFAULT 0,
    "submitted_at" TIMESTAMP(3),
    "approved_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "email_verified_at" TIMESTAMP(3),
    "last_login_at" TIMESTAMP(3),
    "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);

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
    "name" TEXT,
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
    "suite" TEXT,
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
CREATE TABLE "vendor_yards" (
    "id" UUID NOT NULL,
    "vendor_id" UUID NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "suite" TEXT,
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

-- CreateTable
CREATE TABLE "vendor_addresses" (
    "id" UUID NOT NULL,
    "vendor_id" UUID NOT NULL,
    "type" "vendor_address_type" NOT NULL,
    "suite" TEXT,
    "street1" TEXT,
    "street2" TEXT,
    "suburb" TEXT,
    "state" TEXT,
    "country" TEXT,
    "post_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_accreditations" (
    "id" UUID NOT NULL,
    "vendor_id" UUID NOT NULL,
    "accreditation_number" TEXT,
    "expiry_date" DATE,
    "mass_management_expiry" DATE,
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
    "issue_date" DATE,
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

-- CreateTable
CREATE TABLE "employees" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "password_hash" TEXT NOT NULL,
    "employee_code" TEXT,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT,
    "department" TEXT,
    "designation" TEXT,
    "avatar_url" TEXT,
    "status" "account_status" NOT NULL DEFAULT 'PENDING',
    "email_verified_at" TIMESTAMP(3),
    "last_login_at" TIMESTAMP(3),
    "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drivers" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "password_hash" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "middle_name" TEXT,
    "last_name" TEXT,
    "date_of_birth" DATE,
    "country" TEXT,
    "avatar_url" TEXT,
    "status" "account_status" NOT NULL DEFAULT 'PENDING',
    "onboarding_status" "onboarding_status" NOT NULL DEFAULT 'NOT_STARTED',
    "onboarding_step" INTEGER NOT NULL DEFAULT 0,
    "submitted_at" TIMESTAMP(3),
    "approved_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "email_verified_at" TIMESTAMP(3),
    "last_login_at" TIMESTAMP(3),
    "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "drivers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_addresses" (
    "id" UUID NOT NULL,
    "driver_id" UUID NOT NULL,
    "type" "address_type" NOT NULL,
    "suite" TEXT,
    "house_number" TEXT,
    "street" TEXT,
    "suburb" TEXT,
    "state" TEXT,
    "country" TEXT,
    "post_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "driver_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_licences" (
    "id" UUID NOT NULL,
    "driver_id" UUID NOT NULL,
    "licence_number" TEXT,
    "licence_card_number" TEXT,
    "licence_type" "licence_type",
    "issuing_state" TEXT,
    "expiry_date" DATE,
    "verification_status" "verification_status" NOT NULL DEFAULT 'PENDING',
    "verified_at" TIMESTAMP(3),
    "verified_by" UUID,
    "remarks" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "driver_licences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_driving_histories" (
    "id" UUID NOT NULL,
    "driver_id" UUID NOT NULL,
    "issue_date" DATE,
    "expiry_date" DATE,
    "verification_status" "verification_status" NOT NULL DEFAULT 'PENDING',
    "verified_at" TIMESTAMP(3),
    "verified_by" UUID,
    "remarks" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "driver_driving_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_police_verifications" (
    "id" UUID NOT NULL,
    "driver_id" UUID NOT NULL,
    "issue_date" DATE,
    "expiry_date" DATE,
    "verification_status" "verification_status" NOT NULL DEFAULT 'PENDING',
    "verified_at" TIMESTAMP(3),
    "verified_by" UUID,
    "remarks" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "driver_police_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_visas" (
    "id" UUID NOT NULL,
    "driver_id" UUID NOT NULL,
    "visa_status" TEXT,
    "visa_type" TEXT,
    "expiry_date" DATE,
    "verification_status" "verification_status" NOT NULL DEFAULT 'PENDING',
    "verified_at" TIMESTAMP(3),
    "verified_by" UUID,
    "remarks" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "driver_visas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_medicals" (
    "id" UUID NOT NULL,
    "driver_id" UUID NOT NULL,
    "issue_date" DATE,
    "expiry_date" DATE,
    "verification_status" "verification_status" NOT NULL DEFAULT 'PENDING',
    "verified_at" TIMESTAMP(3),
    "verified_by" UUID,
    "remarks" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "driver_medicals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_drug_tests" (
    "id" UUID NOT NULL,
    "driver_id" UUID NOT NULL,
    "issue_date" DATE,
    "expiry_date" DATE,
    "verification_status" "verification_status" NOT NULL DEFAULT 'PENDING',
    "verified_at" TIMESTAMP(3),
    "verified_by" UUID,
    "remarks" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "driver_drug_tests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_passports" (
    "id" UUID NOT NULL,
    "driver_id" UUID NOT NULL,
    "passport_number" TEXT,
    "expiry_date" DATE,
    "verification_status" "verification_status" NOT NULL DEFAULT 'PENDING',
    "verified_at" TIMESTAMP(3),
    "verified_by" UUID,
    "remarks" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "driver_passports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_medicares" (
    "id" UUID NOT NULL,
    "driver_id" UUID NOT NULL,
    "card_number" TEXT,
    "expiry_date" DATE,
    "verification_status" "verification_status" NOT NULL DEFAULT 'PENDING',
    "verified_at" TIMESTAMP(3),
    "verified_by" UUID,
    "remarks" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "driver_medicares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_documents" (
    "id" UUID NOT NULL,
    "driver_id" UUID NOT NULL,
    "doc_type" "driver_document_type" NOT NULL,
    "category" TEXT,
    "expiry_date" DATE,
    "file_name" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "storage_url" TEXT,
    "mime_type" TEXT NOT NULL,
    "size_in_bytes" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "driver_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "actor_type" "actor_type" NOT NULL,
    "actor_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "user_agent" TEXT,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" UUID NOT NULL,
    "actor_type" "actor_type" NOT NULL,
    "actor_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "requested_ip" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_attempts" (
    "id" UUID NOT NULL,
    "actor_type" "actor_type" NOT NULL,
    "email" TEXT NOT NULL,
    "successful" BOOLEAN NOT NULL DEFAULT false,
    "reason" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" UUID NOT NULL,
    "job_number" TEXT NOT NULL,
    "booking_received_date" TEXT,
    "financial_year" TEXT,
    "customer_id" UUID,
    "customer_name" TEXT,
    "customer_account_number" TEXT,
    "account_status" TEXT,
    "agreement_type" TEXT,
    "reference" TEXT,
    "invoice_term" TEXT,
    "cargo_type" TEXT,
    "vehicle_type" TEXT,
    "trailer_category" TEXT,
    "price_gross_amount" DECIMAL(12,2),
    "price_fuel_levy_pct" DECIMAL(7,2),
    "price_fuel_levy_amount" DECIMAL(12,2),
    "price_gst_pct" DECIMAL(7,2),
    "price_gst_amount" DECIMAL(12,2),
    "price_net_amount" DECIMAL(12,2),
    "price_total_amount" DECIMAL(12,2),
    "vendor_id" UUID,
    "vendor_name" TEXT,
    "vendor_gross_amount" DECIMAL(12,2),
    "vendor_fuel_levy_pct" DECIMAL(7,2),
    "vendor_fuel_levy_amount" DECIMAL(12,2),
    "vendor_gst_pct" DECIMAL(7,2),
    "vendor_gst_amount" DECIMAL(12,2),
    "vendor_net_amount" DECIMAL(12,2),
    "vendor_total_amount" DECIMAL(12,2),
    "created_by_admin_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_job_numbers" (
    "id" UUID NOT NULL,
    "job_number" TEXT NOT NULL,
    "financial_year" TEXT,
    "admin_id" UUID,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_job_numbers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_stops" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "type" "booking_stop_type" NOT NULL,
    "position" INTEGER NOT NULL,
    "client_job_number" TEXT,
    "trailer" TEXT,
    "scheduled_at" TEXT,
    "company" TEXT,
    "suite" TEXT,
    "address" TEXT,
    "city" TEXT,
    "suburb" TEXT,
    "state" TEXT,
    "country" TEXT,
    "instructions" TEXT,

    CONSTRAINT "booking_stops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_lanes" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "trailer" TEXT,
    "lane" TEXT,

    CONSTRAINT "booking_lanes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admins_email_key" ON "admins"("email");

-- CreateIndex
CREATE UNIQUE INDEX "admins_phone_key" ON "admins"("phone");

-- CreateIndex
CREATE INDEX "admins_status_idx" ON "admins"("status");

-- CreateIndex
CREATE UNIQUE INDEX "customers_email_key" ON "customers"("email");

-- CreateIndex
CREATE UNIQUE INDEX "customers_phone_key" ON "customers"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "customers_account_number_key" ON "customers"("account_number");

-- CreateIndex
CREATE UNIQUE INDEX "customers_cid_key" ON "customers"("cid");

-- CreateIndex
CREATE INDEX "customers_status_idx" ON "customers"("status");

-- CreateIndex
CREATE INDEX "customers_onboarding_status_idx" ON "customers"("onboarding_status");

-- CreateIndex
CREATE UNIQUE INDEX "customer_contacts_customer_id_type_key" ON "customer_contacts"("customer_id", "type");

-- CreateIndex
CREATE INDEX "customer_additional_contacts_customer_id_idx" ON "customer_additional_contacts"("customer_id");

-- CreateIndex
CREATE INDEX "customer_warehouses_customer_id_idx" ON "customer_warehouses"("customer_id");

-- CreateIndex
CREATE INDEX "customer_directors_customer_id_idx" ON "customer_directors"("customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "customer_addresses_customer_id_type_key" ON "customer_addresses"("customer_id", "type");

-- CreateIndex
CREATE UNIQUE INDEX "customer_billings_customer_id_key" ON "customer_billings"("customer_id");

-- CreateIndex
CREATE INDEX "customer_documents_customer_id_doc_type_idx" ON "customer_documents"("customer_id", "doc_type");

-- CreateIndex
CREATE UNIQUE INDEX "vendors_email_key" ON "vendors"("email");

-- CreateIndex
CREATE UNIQUE INDEX "vendors_phone_key" ON "vendors"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "vendors_vendor_code_key" ON "vendors"("vendor_code");

-- CreateIndex
CREATE INDEX "vendors_status_idx" ON "vendors"("status");

-- CreateIndex
CREATE INDEX "vendors_onboarding_status_idx" ON "vendors"("onboarding_status");

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
CREATE INDEX "vendor_yards_vendor_id_idx" ON "vendor_yards"("vendor_id");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_addresses_vendor_id_type_key" ON "vendor_addresses"("vendor_id", "type");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_accreditations_vendor_id_key" ON "vendor_accreditations"("vendor_id");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_insurances_vendor_id_type_key" ON "vendor_insurances"("vendor_id", "type");

-- CreateIndex
CREATE INDEX "vendor_documents_vendor_id_doc_type_idx" ON "vendor_documents"("vendor_id", "doc_type");

-- CreateIndex
CREATE UNIQUE INDEX "employees_email_key" ON "employees"("email");

-- CreateIndex
CREATE UNIQUE INDEX "employees_phone_key" ON "employees"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "employees_employee_code_key" ON "employees"("employee_code");

-- CreateIndex
CREATE INDEX "employees_status_idx" ON "employees"("status");

-- CreateIndex
CREATE UNIQUE INDEX "drivers_email_key" ON "drivers"("email");

-- CreateIndex
CREATE UNIQUE INDEX "drivers_phone_key" ON "drivers"("phone");

-- CreateIndex
CREATE INDEX "drivers_status_idx" ON "drivers"("status");

-- CreateIndex
CREATE INDEX "drivers_onboarding_status_idx" ON "drivers"("onboarding_status");

-- CreateIndex
CREATE UNIQUE INDEX "driver_addresses_driver_id_type_key" ON "driver_addresses"("driver_id", "type");

-- CreateIndex
CREATE UNIQUE INDEX "driver_licences_driver_id_key" ON "driver_licences"("driver_id");

-- CreateIndex
CREATE UNIQUE INDEX "driver_driving_histories_driver_id_key" ON "driver_driving_histories"("driver_id");

-- CreateIndex
CREATE UNIQUE INDEX "driver_police_verifications_driver_id_key" ON "driver_police_verifications"("driver_id");

-- CreateIndex
CREATE UNIQUE INDEX "driver_visas_driver_id_key" ON "driver_visas"("driver_id");

-- CreateIndex
CREATE UNIQUE INDEX "driver_medicals_driver_id_key" ON "driver_medicals"("driver_id");

-- CreateIndex
CREATE UNIQUE INDEX "driver_drug_tests_driver_id_key" ON "driver_drug_tests"("driver_id");

-- CreateIndex
CREATE UNIQUE INDEX "driver_passports_driver_id_key" ON "driver_passports"("driver_id");

-- CreateIndex
CREATE UNIQUE INDEX "driver_medicares_driver_id_key" ON "driver_medicares"("driver_id");

-- CreateIndex
CREATE INDEX "driver_documents_driver_id_doc_type_idx" ON "driver_documents"("driver_id", "doc_type");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_actor_type_actor_id_idx" ON "refresh_tokens"("actor_type", "actor_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_expires_at_idx" ON "refresh_tokens"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_hash_key" ON "password_reset_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "password_reset_tokens_actor_type_actor_id_idx" ON "password_reset_tokens"("actor_type", "actor_id");

-- CreateIndex
CREATE INDEX "login_attempts_actor_type_email_idx" ON "login_attempts"("actor_type", "email");

-- CreateIndex
CREATE INDEX "login_attempts_created_at_idx" ON "login_attempts"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_job_number_key" ON "bookings"("job_number");

-- CreateIndex
CREATE INDEX "bookings_customer_id_idx" ON "bookings"("customer_id");

-- CreateIndex
CREATE INDEX "bookings_vendor_id_idx" ON "bookings"("vendor_id");

-- CreateIndex
CREATE INDEX "bookings_financial_year_idx" ON "bookings"("financial_year");

-- CreateIndex
CREATE UNIQUE INDEX "booking_job_numbers_job_number_key" ON "booking_job_numbers"("job_number");

-- CreateIndex
CREATE INDEX "booking_job_numbers_expires_at_idx" ON "booking_job_numbers"("expires_at");

-- CreateIndex
CREATE INDEX "booking_stops_booking_id_idx" ON "booking_stops"("booking_id");

-- CreateIndex
CREATE INDEX "booking_lanes_booking_id_idx" ON "booking_lanes"("booking_id");

-- AddForeignKey
ALTER TABLE "customer_contacts" ADD CONSTRAINT "customer_contacts_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_additional_contacts" ADD CONSTRAINT "customer_additional_contacts_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_warehouses" ADD CONSTRAINT "customer_warehouses_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_directors" ADD CONSTRAINT "customer_directors_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_addresses" ADD CONSTRAINT "customer_addresses_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_billings" ADD CONSTRAINT "customer_billings_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_documents" ADD CONSTRAINT "customer_documents_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
ALTER TABLE "vendor_yards" ADD CONSTRAINT "vendor_yards_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_addresses" ADD CONSTRAINT "vendor_addresses_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_accreditations" ADD CONSTRAINT "vendor_accreditations_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_insurances" ADD CONSTRAINT "vendor_insurances_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_documents" ADD CONSTRAINT "vendor_documents_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_addresses" ADD CONSTRAINT "driver_addresses_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_licences" ADD CONSTRAINT "driver_licences_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_driving_histories" ADD CONSTRAINT "driver_driving_histories_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_police_verifications" ADD CONSTRAINT "driver_police_verifications_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_visas" ADD CONSTRAINT "driver_visas_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_medicals" ADD CONSTRAINT "driver_medicals_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_drug_tests" ADD CONSTRAINT "driver_drug_tests_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_passports" ADD CONSTRAINT "driver_passports_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_medicares" ADD CONSTRAINT "driver_medicares_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_documents" ADD CONSTRAINT "driver_documents_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_stops" ADD CONSTRAINT "booking_stops_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_lanes" ADD CONSTRAINT "booking_lanes_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

