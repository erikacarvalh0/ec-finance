# Annual cashflow CSV export

The reports page provides an authenticated CSV export of the current UTC calendar year via `/api/reports/annual?year=YYYY`. The route reuses the existing owner-scoped recorded monthly cashflow query and annual aggregation, excluding investment contributions from income and avoiding linked card-expense duplication. Values are exact integer cents and include the number of months with recorded activity. This is a single annual summary, not a transaction-level export. Response caching is disabled and the filename contains only a validated year.
