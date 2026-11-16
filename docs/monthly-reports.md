# Recorded monthly cashflow

The /reports page shows six months of recorded income and expenses, using UTC calendar months and exact integer cents. Recorded income and expense dates (or createdAt when null) determine month; card transactions use occurredAt. Explicitly linked manual card expenses are excluded to avoid duplicate purchases.

This report does not project recurring future payments, distribute installments into later months, or include investments as salary. Forecasting and invoice views have distinct semantics. Every query is scoped to the authenticated user, with a maximum query range of 36 calendar months.

Initial scope: read-only comparison, chart and accessible totals. Category breakdown and exports follow separately.

## Category spending breakdown

The report includes the current UTC month's categorized spending, ranked by amount.
It reuses the owner-scoped budget expense and transaction aggregation, including explicit
manual/imported card purchase deduplication. The chart shows accessible progress bars and
exact currency amounts; uncategorized spending is excluded, so percentages reflect
**categorized expenses**, not all expenses. Categories without a positive total are omitted.

## Annual comparison

The reports page also compares the previous and current UTC calendar year. It queries 24 monthly recorded cashflow periods from the same authenticated user-scoped read path as the monthly comparison, and sums income, expenses and net cashflow using exact integer cents. The current year is year-to-date, not an annualized projection; a year with no records displays zero. Linked manual expenses remain excluded to prevent double-counting imported card purchases. Recurring future charges, installments projected to other months and investment transfers are not included.

## CSV export

The reports page offers a CSV download of the current UTC calendar month's recorded cashflow through `/api/reports/cashflow?period=YYYY-MM`. The route requires authentication and uses the existing owner-scoped report query, including linked expense deduplication. CSV values are exact integer cents (not formatted floating-point currency), with a UTF-8 BOM and CRLF line endings for spreadsheet compatibility. Exported data is private and not cached. This first export covers one month at a time; annual exports and category-level data are not yet included.
