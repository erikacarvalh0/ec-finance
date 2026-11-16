-- AlterTable
ALTER TABLE "CreditCard" ADD COLUMN "creditLimitInCents" BIGINT;

-- AddConstraint
ALTER TABLE "CreditCard" ADD CONSTRAINT "CreditCard_positive_limit_check"
CHECK ("creditLimitInCents" IS NULL OR "creditLimitInCents" > 0);
