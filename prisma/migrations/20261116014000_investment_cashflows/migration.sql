-- CreateEnum
CREATE TYPE "InvestmentCashflowType" AS ENUM ('DEPOSIT', 'WITHDRAWAL');

-- CreateTable
CREATE TABLE "InvestmentCashflow" (
    "id" TEXT NOT NULL,
    "investmentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "InvestmentCashflowType" NOT NULL,
    "amountInCents" BIGINT NOT NULL,
    "occurredAt" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvestmentCashflow_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "InvestmentCashflow_positive_amount_check" CHECK ("amountInCents" > 0)
);

-- CreateIndex
CREATE INDEX "InvestmentCashflow_investmentId_occurredAt_createdAt_idx"
ON "InvestmentCashflow"("investmentId","occurredAt","createdAt");

-- CreateIndex
CREATE INDEX "InvestmentCashflow_userId_occurredAt_idx"
ON "InvestmentCashflow"("userId","occurredAt");

-- AddForeignKey
ALTER TABLE "InvestmentCashflow"
ADD CONSTRAINT "InvestmentCashflow_investmentId_userId_fkey"
FOREIGN KEY ("investmentId","userId") REFERENCES "Investment"("id","userId")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestmentCashflow"
ADD CONSTRAINT "InvestmentCashflow_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
