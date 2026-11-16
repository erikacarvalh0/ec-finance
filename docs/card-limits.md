# Card credit limit estimates

Cardholders can set a positive credit-limit amount manually. The card overview computes a simple estimate from all card transactions and manual credit expenses associated with the card (excluding manual expenses explicitly linked to imported charges), then subtracts manually recorded invoice payments.

This is **not a bank-verified available limit**. Bank-authorized holds, the balance from before the application was used, statement adjustments, refunds and merchant refunds may be absent. Importers must never treat the estimate as the bank's current available credit. Old historical charges and payments can also distort this estimate if historical records are incomplete. The API labels its values as an estimate.

Every API read/write is scoped to the authenticated user, and Prisma migration adds nullable `creditLimitInCents` with a strictly positive value check. No changes to bank accounts or payment initiation occur.
