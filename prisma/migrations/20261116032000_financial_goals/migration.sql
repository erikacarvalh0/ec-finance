CREATE TABLE "FinancialGoal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "targetInCents" BIGINT NOT NULL,
    "savedInCents" BIGINT NOT NULL DEFAULT 0,
    "deadline" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FinancialGoal_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FinancialGoal_id_userId_key" ON "FinancialGoal"("id", "userId");
CREATE INDEX "FinancialGoal_userId_createdAt_idx" ON "FinancialGoal"("userId", "createdAt");
ALTER TABLE "FinancialGoal" ADD CONSTRAINT "FinancialGoal_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
