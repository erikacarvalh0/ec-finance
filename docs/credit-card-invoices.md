# Credit card invoices

EC Finance supports manual credit cards without requiring bank credentials. Cards may also be backed by an existing user-owned bank connection.

## Card configuration

Open `/cards` to create a card or configure its closing and due days (1–31). The invoice period is identified by the calendar month in which the card closes. Purchases made **on** the closing day belong to that closing month; purchases made **after** it belong to the next invoice period. Days that do not exist in a particular month are clamped to that month's final calendar day. Invoice due dates are set after the closing date and can fall in the following month.

These conventions are an initial planning approximation. Banks can use slightly different cutoff times, holidays and posting dates; always follow the issuer's statement for actual amounts and due dates.

## Included transactions

The card invoice combines:

- Recorded credit-card transactions associated with the selected card, grouped by purchase date and closing cycle.
- Manually entered `CREDIT` expenses that explicitly select this same card. Multi-installment manual expenses are split over consecutive invoice periods, distributing leftover cents to the earliest installments.

Expenses with other payment methods, or credit expenses not associated with a card, are excluded from card invoices. The new card invoice view does not change the existing general financial forecast.

## Duplicate prevention

A manual single-payment card expense can be explicitly linked to an existing transaction **on the same user-owned card**. After linking, the imported transaction is the invoice source and the manual expense is not added again. Linking a multi-installment expense to a single transaction is rejected to avoid accidentally hiding the remaining installments.

The relationship is enforced by unique and composite foreign keys, preventing cross-user links or two manual expenses claiming the same recorded transaction. Linking is always explicit; description-only or amount-only heuristics can incorrectly merge different purchases and are intentionally not used.

## Security and limitations

All reads and writes use the authenticated user ID. Card and transaction relationships must belong to that user and are enforced by the PostgreSQL schema.

Invoices are calculated projections, not issuer-confirmed statements. This phase does **not** include credit-card payment tracking, charges that have not yet been imported, refunds, interest, fees, bank-specific installment formats, or automatic bank reconciliation. Linking manually entered installments to individual imported installments requires a dedicated future matching flow.

The Prisma migration `20261116002500_credit_card_invoices` adds nullable card settings, optional expense-card relationships and optional explicit invoice deduplication links. Deploy with `npm run db:deploy`, after normal backup and review.
