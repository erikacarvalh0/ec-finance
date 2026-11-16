# Open Finance provider-to-preview mapping

The pure `mapProviderBatchToImportPreview` function converts normalized provider card transaction batches into the authenticated import-preview request contract. It preserves provider IDs, exact integer cents, and UTC timestamps. It reports identical repeated provider IDs while rejecting conflicting duplicates. The `ownedCardId` parameter is a card identifier **already resolved and authorized by the caller**; passing an arbitrary card ID is not sufficient to establish ownership. The provider's `cardExternalId` is not trusted as a local card ID.

This module does not connect to a bank, obtain consent, persist transactions, or send API requests. A future integration must authenticate the user, map the provider account/card to a user-owned card, invoke the import-preview service, and revalidate identity and idempotency when writing to PostgreSQL.
