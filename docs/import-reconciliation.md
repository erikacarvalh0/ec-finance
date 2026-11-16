# Provider transaction import reconciliation

The pure reconciliation preview compares provider transaction IDs within a card. It separates candidates into new records, exact-identity duplicates, and amount conflicts. It never assumes two purchases with the same merchant and amount are duplicates. This stage does not write to the database or connect to a provider.

**Security:** The caller must first fetch existing transactions scoped to the authenticated user and their authorized card; the pure function cannot enforce database tenant isolation. The persistence layer must still use database uniqueness and transactional writes to protect against concurrent imports. Existing records without a stored amount can be treated as duplicates by identity but cannot be checked for an amount conflict. Future provider adapters must supply stable IDs and normalize amount signs before calling this function.
