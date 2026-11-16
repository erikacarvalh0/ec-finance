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
