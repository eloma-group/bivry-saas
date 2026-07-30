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
CREATE TYPE "licence_type" AS ENUM ('CAR', 'HEAVY_RIGID', 'HEAVY_COMBINATION', 'MULTI_COMBINATION', 'MOTORCYCLE');

-- CreateEnum
CREATE TYPE "driver_document_type" AS ENUM ('PROFILE_PHOTO', 'LICENCE_FRONT', 'LICENCE_BACK', 'DRIVING_HISTORY', 'POLICE_VERIFICATION', 'VISA', 'MEDICAL', 'DRUG_TEST', 'ADDITIONAL');

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
    "first_name" TEXT NOT NULL,
    "last_name" TEXT,
    "company_name" TEXT,
    "avatar_url" TEXT,
    "status" "account_status" NOT NULL DEFAULT 'PENDING',
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
CREATE TABLE "vendors" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "password_hash" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "contact_person" TEXT,
    "abn" TEXT,
    "logo_url" TEXT,
    "status" "account_status" NOT NULL DEFAULT 'PENDING',
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
    "nationality" TEXT,
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
    "verification_status" "verification_status" NOT NULL DEFAULT 'PENDING',
    "verified_at" TIMESTAMP(3),
    "verified_by" UUID,
    "remarks" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "driver_drug_tests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_documents" (
    "id" UUID NOT NULL,
    "driver_id" UUID NOT NULL,
    "doc_type" "driver_document_type" NOT NULL,
    "category" TEXT,
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
CREATE INDEX "customers_status_idx" ON "customers"("status");

-- CreateIndex
CREATE UNIQUE INDEX "vendors_email_key" ON "vendors"("email");

-- CreateIndex
CREATE UNIQUE INDEX "vendors_phone_key" ON "vendors"("phone");

-- CreateIndex
CREATE INDEX "vendors_status_idx" ON "vendors"("status");

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
ALTER TABLE "driver_documents" ADD CONSTRAINT "driver_documents_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

