ALTER TABLE "CategoryBudget"
    ADD COLUMN "rolloverInCents" BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN "rolloverCapInCents" BIGINT,
    ADD COLUMN "rolloverAppliedAt" TIMESTAMP(3),
    ADD CONSTRAINT "CategoryBudget_rollover_check" CHECK (
        "rolloverInCents" >= 0 AND (
            ("rolloverAppliedAt" IS NULL AND "rolloverCapInCents" IS NULL AND "rolloverInCents" = 0)
            OR ("rolloverAppliedAt" IS NOT NULL AND "rolloverCapInCents" IS NOT NULL
                AND "rolloverCapInCents" > 0 AND "rolloverInCents" <= "rolloverCapInCents")
        )
    );
