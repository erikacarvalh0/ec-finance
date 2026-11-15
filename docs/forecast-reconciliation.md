# Forecast reconciliation

The planning UI allows each scheduled expense installment or recurring income occurrence to be marked **pending**, **settled** (paid/received), or **canceled**. Users may record an actual amount when settling an occurrence, supporting partial discounts and corrected payment amounts.

## Model

The generated forecast remains derived from the original Expense/Income data. Separate `ExpenseOccurrence` and `IncomeOccurrence` rows store only explicit user decisions, keyed by source and calendar month. The original amount and date are preserved. Setting a status back to pending clears the recorded amount.

- Settled occurrences use their recorded amount, or the planned amount when no actual amount is supplied.
- Canceled occurrences remain visible in history but contribute zero to the month's projection.
- Pending occurrences retain their planned amount.
- Monthly reports separate pending, settled and canceled items, and distinguish planned and realized totals.
- Changing one month never affects a different installment or recurring month.

## Authorization and integrity

Every write derives the user from the server session. The source record must belong to that user and the requested calendar month must exist in the generated schedule. The database maintains tenant ownership using compound foreign keys, plus unique source/month constraints to prevent duplicate states.

## Limitations

This is a **manual reconciliation** workflow and does not move money, synchronize with banks, or independently verify that a payment was made. Editing the actual amount is supported for settled occurrences; editing an original expense's amount, installment count or recurring rule is not part of this PR. The six-month forecast still represents projected cash flow rather than a bank statement.

## Tests

Unit tests cover pending/settled/canceled calculations, owner checks, invalid dates and schedule boundaries. PostgreSQL integration tests cover per-month updates, isolation and duplicate prevention.
