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
