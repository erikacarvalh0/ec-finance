# Provider-neutral card import boundary

This module defines a strict, provider-neutral adapter for **card transaction import previews**. An eventual Open Finance connector maps its provider-specific response into a batch with `cardExternalId`, plus transaction `externalId`, `description`, `amountInCents` and ISO timestamp.

## Validation

- Require nonempty external IDs, descriptions and dates with timezone offsets.
- Preserve exact positive integer cents in a signed 64-bit range.
- Cap batches at 500 items.
- Deduplicate repeated IDs within the batch; reject conflicting contents under the same ID.
- Never collapse distinct purchases merely because their amount and merchant match.

This validation is **not** a live Open Finance connection. It does not request consent, call banks, store credentials, write transactions, or schedule synchronization. Actual persistence requires authenticated owner/card association, provider-specific transaction status and versioning, and database idempotency through the existing `cardId/providerTransactionId` unique key. Transaction classification and financial reconciliation must be run in the eventual importer before persistence.

The adapter intentionally fails closed on ambiguous duplicates rather than silently corrupting ledger history.
