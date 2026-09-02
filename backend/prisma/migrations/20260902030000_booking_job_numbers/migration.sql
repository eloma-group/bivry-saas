-- Job numbers held while a Create Booking form is open.
--
-- The number used to be handed out only on save, so the form could not show an
-- admin what they were about to be given, and two admins filling a booking in at
-- the same time were both looking at the same next number. A row here parks one
-- number for one admin: the form reads it on open, the save consumes it, and
-- closing the form releases it. `expires_at` is the backstop for a browser that
-- never got to say either.

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

-- CreateIndex
CREATE UNIQUE INDEX "booking_job_numbers_job_number_key" ON "booking_job_numbers"("job_number");

-- CreateIndex
CREATE INDEX "booking_job_numbers_expires_at_idx" ON "booking_job_numbers"("expires_at");
