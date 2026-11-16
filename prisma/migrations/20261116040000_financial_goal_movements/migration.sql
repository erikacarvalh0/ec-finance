CREATE TYPE "FinancialGoalMovementType" AS ENUM ('DEPOSIT', 'WITHDRAWAL');

CREATE TABLE "FinancialGoalMovement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "type" "FinancialGoalMovementType" NOT NULL,
    "amountInCents" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FinancialGoalMovement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FinancialGoalMovement_goalId_createdAt_idx" ON "FinancialGoalMovement"("goalId", "createdAt");
CREATE INDEX "FinancialGoalMovement_userId_createdAt_idx" ON "FinancialGoalMovement"("userId", "createdAt");
ALTER TABLE "FinancialGoalMovement" ADD CONSTRAINT "FinancialGoalMovement_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinancialGoalMovement" ADD CONSTRAINT "FinancialGoalMovement_goalId_userId_fkey"
    FOREIGN KEY ("goalId", "userId") REFERENCES "FinancialGoal"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;
