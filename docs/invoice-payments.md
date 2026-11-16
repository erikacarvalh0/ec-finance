# Invoice payment tracking

Credit-card invoices are calculated from the recorded transactions and explicitly card-linked manual expenses. Users may register **manual invoice payments**, optionally in multiple installments, against a specific card and invoice billing period.

## Status model

- `OPEN`: no recorded payments and the invoice has not yet closed.
- `CLOSED`: no recorded payments and the invoice closing day has passed.
- `PARTIALLY_PAID`: one or more payments were recorded but a positive balance remains.
- `PAID`: recorded payments exactly equal the calculated invoice total.

The remaining balance equals the calculated invoice total minus recorded payments, using integer cents. A zero-value invoice is not treated as a payment.

## Recording a payment

The authenticated user submits a positive amount, a payment date and a unique idempotency key. The server verifies card ownership, calculates the invoice from user-owned records, checks the unpaid amount, and persists the payment. Payment updates run inside a PostgreSQL **SERIALIZABLE** transaction to prevent concurrent requests from spending the same invoice balance. Serialization conflicts are returned as HTTP 409 and can be retried.

The unique key protects against duplicate submissions; the key is scoped to the user and card. A repeated request with the identical payload returns the existing payment; changing the amount or date with the same key is rejected. The UI preserves the same key for retries until a successful response.

## Limitations

The user is declaring payments manually; this is **not a bank-verified card settlement**. Issuers can correct a statement after the user records a payment. If underlying invoice charges change, the recorded payments might exceed the recalculated total; the service exposes an inconsistency instead of silently clamping negative balances. This phase does not add refunds, chargebacks, late fees, automatic reconciliation, card limits, editing/deleting payment history or settlement against bank-account debits.

The payment table uses a composite card/user foreign key, positive-amount check, period-format check and unique idempotency key constraint. Run the reviewed migration through `npm run db:deploy` after backup and standard review.
