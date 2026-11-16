-- CreateTable
CREATE TABLE "InvoicePayment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "amountInCents" BIGINT NOT NULL,
    "paidAt" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoicePayment_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "InvoicePayment_positive_amount_check" CHECK ("amountInCents" > 0),
    CONSTRAINT "InvoicePayment_period_format_check" CHECK (
        "period" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'
    )
);

-- CreateIndex
CREATE UNIQUE INDEX "InvoicePayment_userId_cardId_idempotencyKey_key"
ON "InvoicePayment"("userId", "cardId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "InvoicePayment_userId_cardId_period_idx"
ON "InvoicePayment"("userId", "cardId", "period");

-- AddForeignKey
ALTER TABLE "InvoicePayment"
ADD CONSTRAINT "InvoicePayment_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoicePayment"
ADD CONSTRAINT "InvoicePayment_cardId_userId_fkey"
FOREIGN KEY ("cardId", "userId") REFERENCES "CreditCard"("id", "userId")
ON DELETE RESTRICT ON UPDATE CASCADE;
