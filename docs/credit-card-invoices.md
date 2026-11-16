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

## Charge calculation model

`calculateInvoiceCharges` in `src/modules/cards/charges.ts` provides a pure estimate of invoice interest, a late fine and a fixed late fee. It is not yet connected to persisted settings, invoice APIs or payment registration. Callers supply the billing period, existing closing/due-day settings, the invoice total, explicit nonnegative daily interest and fine rates in basis points (100 basis points = 1%), and the fixed fee in integer cents. All monetary arithmetic uses `bigint`.

The closing day remains open through the end of its UTC calendar day. Existing invoice rules determine the due date, including short months and year rollover. The due day is interest-free; the following UTC day is the first overdue day. `overdueDays` measures calendar lateness, even after principal is cleared.

The calculator accepts dated positive credits for payments or refunds **not already included in the supplied invoice total**. Credits take effect before accrual on their UTC calendar day; future credits are ignored. Refunds already represented by negative imported invoice lines must not also be passed as credits. A refund reduces principal from its effective date without retroactively erasing interest already accrued. Excess credits offset charges; the returned payable balance is floored at zero and does not represent a separate credit ledger.

Interest is simple (no interest on fees or interest), based on each overdue day's positive principal. The fine uses positive principal on the first overdue day, and the fixed fee applies once when that principal is positive. Each percentage component is rounded half up to cents once after calculation. Clearing principal by the first overdue day prevents all charges. No bank rates, business-day adjustments, compounding or automatic charge reversals are assumed; issuer-specific policies require separate integration.
