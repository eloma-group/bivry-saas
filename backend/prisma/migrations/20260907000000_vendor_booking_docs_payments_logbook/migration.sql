-- CreateEnum
CREATE TYPE "document_approval_status" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "booking_payment_status" AS ENUM ('PENDING', 'PAID', 'HOLD', 'ADJUSTED');

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "logbook_payment_date_checked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "logbook_postcheck_checked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "logbook_precheck_checked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "logbook_total_payment_checked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "payment_status" "booking_payment_status" NOT NULL DEFAULT 'PENDING';

-- CreateTable
CREATE TABLE "booking_documents" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "uploaded_by_type" TEXT,
    "uploaded_by_id" UUID,
    "category" TEXT,
    "file_name" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "storage_url" TEXT,
    "mime_type" TEXT NOT NULL,
    "size_in_bytes" INTEGER NOT NULL,
    "approval_status" "document_approval_status" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "booking_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "booking_documents_booking_id_idx" ON "booking_documents"("booking_id");

-- AddForeignKey
ALTER TABLE "booking_documents" ADD CONSTRAINT "booking_documents_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
