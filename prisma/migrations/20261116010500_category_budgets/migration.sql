-- AlterTable
ALTER TABLE "Expense" ADD COLUMN "categoryId" TEXT;

-- CreateTable
CREATE TABLE "CategoryBudget" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "limitInCents" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CategoryBudget_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "CategoryBudget_limit_positive_check" CHECK ("limitInCents" > 0),
    CONSTRAINT "CategoryBudget_period_format_check" CHECK ("period" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$')
);

-- CreateIndex
CREATE UNIQUE INDEX "CategoryBudget_userId_categoryId_period_key"
ON "CategoryBudget"("userId", "categoryId", "period");

-- CreateIndex
CREATE INDEX "CategoryBudget_userId_period_idx" ON "CategoryBudget"("userId", "period");

-- CreateIndex
CREATE INDEX "Expense_userId_categoryId_idx" ON "Expense"("userId", "categoryId");

-- AddForeignKey
ALTER TABLE "Expense"
ADD CONSTRAINT "Expense_categoryId_userId_fkey"
FOREIGN KEY ("categoryId", "userId") REFERENCES "Category"("id", "userId")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryBudget"
ADD CONSTRAINT "CategoryBudget_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryBudget"
ADD CONSTRAINT "CategoryBudget_categoryId_userId_fkey"
FOREIGN KEY ("categoryId", "userId") REFERENCES "Category"("id", "userId")
ON DELETE CASCADE ON UPDATE CASCADE;
