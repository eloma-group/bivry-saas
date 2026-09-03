-- Options added to a dropdown from a form.
--
-- Every dropdown ships with a list written in the frontend's constants. Adding
-- to one used to mean editing that file and deploying, so anybody who needed a
-- trailer or a designation the list did not carry had no way to record it. A
-- row here is one option somebody added, and it is offered alongside the built
-- in list the next time that dropdown opens.
--
-- Only the additions live here. The built in lists stay in code, and no stored
-- answer is read back through this table - a form stores the text itself - so
-- deleting a row costs an option in a list and never an answer already given.

-- CreateTable
CREATE TABLE "option_values" (
    "id" UUID NOT NULL,
    "list_key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "created_by_type" TEXT,
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "option_values_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "option_values_list_key_idx" ON "option_values"("list_key");

-- CreateIndex
CREATE UNIQUE INDEX "option_values_list_key_value_key" ON "option_values"("list_key", "value");
