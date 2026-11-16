# Expense history filtering

The expense history page supports an optional case-insensitive description search, fixed/variable expense type, payment method and cursor pagination. Server-side queries always restrict by the authenticated user ID and return at most 20 displayed expenses with an additional lookahead record.

The cursor uses the ID of the final displayed row. Sorting uses descending `createdAt` and `id` to give deterministic ordering. Filter submissions do not preserve the previous cursor, and loading the next page keeps the current filters.

This changes only the list view, not existing payment reconciliation, recurring projections or invoice amounts. No schema migration is needed.
