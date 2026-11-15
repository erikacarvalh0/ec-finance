# Monthly cashflow forecast

EC Finance derives a six-month cashflow forecast from records owned by the authenticated user. No additional database tables are necessary: projections are computed from the existing `Expense` and `Income` models.

## Installments

- The entered expense amount is the **total purchase amount**.
- If installments is greater than one, the amount is split into consecutive calendar months.
- Any leftover cents are assigned to the first installments so the sum exactly equals the original amount.
- An optional expense date determines the first installment month; otherwise the creation date is used.
- When a month has fewer days than the purchase date, the scheduled date is clamped to the month's final day.
- A fixed expense with multiple installments is scheduled only for its defined installment count; it is not also repeated indefinitely.

## Fixed expenses

A one-installment expense marked `FIXED` is projected monthly from its starting date. Variable expenses without installments appear once.

## Income

Entries explicitly marked `RECURRING` are forecast each month from their starting date. Salary and other income are included only for their original month, until an explicit recurrence is configured. Forecasting creates **no duplicate database records**.

## Boundaries

The forecast is a **planning view**, not a bank invoice or a confirmation of payment. Credit-card transactions imported from banks are not given an artificial installment schedule. Existing card transactions stay in actual transaction views, and fixed-card rules do not produce hypothetical transactions. Avoid adding forecast totals directly to recorded bank charges or counting the same expense twice across sources.

The UI shows a six-month rolling window and each month's expected expenses, income and net balance. All queries are scoped to the current authenticated user, and date arithmetic uses UTC calendar months.

## Testing

`src/modules/forecast/schedule.test.ts` verifies rounding, leap years, month-end clamping, future installments, fixed expenses, recurring income and one-time entries. Database integration tests confirm projections only use owner records.
