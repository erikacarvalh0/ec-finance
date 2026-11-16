-- AlterTable
ALTER TABLE "CreditCard" ADD COLUMN "closingDay" INTEGER,
ADD COLUMN "dueDay" INTEGER;

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN "cardId" TEXT,
ADD COLUMN "linkedTransactionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Expense_linkedTransactionId_key" ON "Expense"("linkedTransactionId");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_id_userId_key" ON "Transaction"("id","userId");

-- CreateIndex
CREATE INDEX "Expense_userId_cardId_idx" ON "Expense"("userId","cardId");

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_cardId_userId_fkey"
FOREIGN KEY ("cardId","userId") REFERENCES "CreditCard"("id","userId")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_linkedTransactionId_userId_fkey"
FOREIGN KEY ("linkedTransactionId","userId") REFERENCES "Transaction"("id","userId")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddConstraint
ALTER TABLE "CreditCard" ADD CONSTRAINT "CreditCard_billing_days_check"
CHECK (("closingDay" IS NULL AND "dueDay" IS NULL)
OR ("closingDay" BETWEEN 1 AND 31 AND "dueDay" BETWEEN 1 AND 31));
