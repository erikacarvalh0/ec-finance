-- CreateEnum
CREATE TYPE "OccurrenceStatus" AS ENUM ('PENDING', 'SETTLED', 'CANCELED');

-- CreateTable
CREATE TABLE "ExpenseOccurrence" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expenseId" TEXT NOT NULL,
    "dueMonth" DATE NOT NULL,
    "status" "OccurrenceStatus" NOT NULL DEFAULT 'PENDING',
    "actualAmountInCents" BIGINT,
    "settledAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpenseOccurrence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncomeOccurrence" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "incomeId" TEXT NOT NULL,
    "dueMonth" DATE NOT NULL,
    "status" "OccurrenceStatus" NOT NULL DEFAULT 'PENDING',
    "actualAmountInCents" BIGINT,
    "settledAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IncomeOccurrence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExpenseOccurrence_userId_dueMonth_idx" ON "ExpenseOccurrence"("userId", "dueMonth");

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseOccurrence_expenseId_dueMonth_key" ON "ExpenseOccurrence"("expenseId", "dueMonth");

-- CreateIndex
CREATE INDEX "IncomeOccurrence_userId_dueMonth_idx" ON "IncomeOccurrence"("userId", "dueMonth");

-- CreateIndex
CREATE UNIQUE INDEX "IncomeOccurrence_incomeId_dueMonth_key" ON "IncomeOccurrence"("incomeId", "dueMonth");

-- CreateIndex
CREATE UNIQUE INDEX "Expense_id_userId_key" ON "Expense"("id", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Income_id_userId_key" ON "Income"("id", "userId");

-- AddForeignKey
ALTER TABLE "ExpenseOccurrence" ADD CONSTRAINT "ExpenseOccurrence_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseOccurrence" ADD CONSTRAINT "ExpenseOccurrence_expenseId_userId_fkey" FOREIGN KEY ("expenseId", "userId") REFERENCES "Expense"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncomeOccurrence" ADD CONSTRAINT "IncomeOccurrence_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncomeOccurrence" ADD CONSTRAINT "IncomeOccurrence_incomeId_userId_fkey" FOREIGN KEY ("incomeId", "userId") REFERENCES "Income"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;
