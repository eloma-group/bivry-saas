-- Customer account number (CAN5000 series), assigned by the server on create.
ALTER TABLE "customers" ADD COLUMN "account_number" TEXT;

CREATE UNIQUE INDEX "customers_account_number_key" ON "customers"("account_number");
