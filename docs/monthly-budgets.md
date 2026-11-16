# Monthly budgets and expense categories

Each authenticated user can create their own expense categories, assign one to a manually entered expense and set a category-specific budget for each calendar month. The budget is expressed in integer cents and must be positive.

The dashboard and `/budgets` page show monthly spend, budget, remaining amount and threshold status. The user can change the monthly limit by saving it again; a unique `userId + categoryId + period` key guarantees one budget per category per month.

## Status thresholds

- **On track:** below 80% spent
- **Near limit:** 80% up to (but not including) 100%
- **At limit:** exactly 100%
- **Over limit:** more than 100%
- **No budget:** spending exists but no monthly limit has been configured

Alerts are visible on the dashboard and budget page. Notifications by email or push are not implemented.

## Spending calculation and boundaries

Spending is derived from categorized manual expense records whose specified date falls within the selected UTC calendar month, or whose creation date falls within that month if no date was specified. Recorded card transactions are included by transaction date. A manual expense explicitly linked to an imported card transaction is omitted from manual spending to avoid double-counting that purchase.

Uncategorized purchases are excluded from category totals. An imported card transaction needs its own category; a linked manual expense cannot transfer its category automatically to an uncategorized imported charge.

**Important:** this is an overview of recorded spending, not a cash-account balance or a forecast of future installment invoices. Multi-installment purchases are counted as originally registered in their first month in this initial version. Fixed monthly expenses are not automatically replicated into later budget months. Separately calculated forecasts and credit-card invoice periods have different accounting semantics. These distinctions prevent presenting speculative future spending as already recorded expenses.

## Security

All reads, writes and category assignment checks are restricted to the authenticated user's ID. PostgreSQL enforces composite foreign keys on expense-category and budget-category associations, so categories cannot cross tenant boundaries. The `CategoryBudget` model also has a positive-limit database check constraint.

## Tests

Vitest covers percentages and threshold boundaries, deduplication, validation and tenant-safe queries. Integration tests run against disposable PostgreSQL 16 with reviewed Prisma migrations and verify ownership, monthly budget upserts and real spending calculations.

## Previous-month balance preview

For each category with a current monthly budget, the budget page displays a read-only **one-month** carryover preview. It adds the previous month's unspent positive budget balance to the current month's remaining amount. If the previous month has no budget, no amount carries forward. Overspending in the previous month does not become a negative carryover; current overspending remains visible as a negative combined balance. The preview itself is not persisted and does not change the monthly limit, alerts, or actual cash balances. It reads the preceding month’s effective budget, which can include an explicitly applied rollover. The same authenticated user-scoped reporting query is used for both months.

## Persisted monthly rollover

`POST /api/budgets/rollover` accepts `{ "categoryId": "…", "period": "2027-01", "capInCents": "3000" }` for the authenticated user. This is an explicit opt-in per category and target month; no automatic job runs. The target budget must already exist. The positive integer cap (up to 18 digits) is saved with the application timestamp and transferred amount.

The action snapshots the preceding month's positive remaining balance, including any rollover already applied to that source month, capped by `capInCents`. Missing source budgets and overspending transfer zero. Apply months in chronological order to accumulate balances. Only the first request can apply, even when it transfers zero; retries or concurrent requests return `applied: false` and cannot change the saved amount or cap. Later source spending edits do not recalculate the snapshot.

Reports, dashboard alerts and remaining balances use the base limit plus persisted rollover. Saving the base limit again preserves the rollover. Copying previous limits continues to copy only base limits. The read-only preview is hidden for a month with an applied rollover to avoid counting the source balance twice. Apply the budget rollover migration before using this endpoint. The action is currently API-only.
