# Transaction import persistence

POST `/api/transactions/import` with an authenticated session, `cardId` and up to 500 `transactions` in the same format as the preview endpoint. The service verifies card ownership, rechecks existing provider IDs inside a Prisma transaction, rejects mismatched amounts, and uses the unique `(cardId, providerTransactionId)` constraint with `skipDuplicates` for concurrent import idempotency. It returns `importedCount` and `duplicateCount`.

This endpoint accepts user-submitted records, not trusted bank-sourced records. It does not obtain Open Finance consent or validate provider authenticity. It does not create expenses, reconcile invoices, or classify fixed merchants; these remain separate integration tasks. A real connector must associate external cards to owned cards and preserve provider transaction identity. The endpoint must be protected with standard session/CSRF safeguards and operational rate limits before public production rollout.
