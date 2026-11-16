# Income history search and pagination

The `/incomes` page supports an optional case-insensitive search against the description or responsible party, optional type filtering (salary, recurring or other) and paginated loading in groups of twenty.

Every query is restricted to the authenticated user ID, sorted by creation timestamp descending and then record ID descending. Cursor pagination avoids unstable offsets while new records are inserted. Filtering clears the cursor; the next page keeps active search/type filters.

Income records are not modified by filtering. This is a historical listing feature only: it does not project recurring income into future monthly entries or provide bank-verified reconciliation. The maximum search term length is 100 characters.
