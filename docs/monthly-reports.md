# Recorded monthly cashflow

The /reports page shows six months of recorded income and expenses, using UTC calendar months and exact integer cents. Recorded income and expense dates (or createdAt when null) determine month; card transactions use occurredAt. Explicitly linked manual card expenses are excluded to avoid duplicate purchases.

This report does not project recurring future payments, distribute installments into later months, or include investments as salary. Forecasting and invoice views have distinct semantics. Every query is scoped to the authenticated user, with a maximum query range of 36 calendar months.

Initial scope: read-only comparison, chart and accessible totals. Category breakdown and exports follow separately.
