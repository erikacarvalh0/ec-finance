import { normalizeCardImportBatch, type ProviderCardBatch } from './adapter';

/**
 * Maps a validated provider payload to the authenticated card import preview
 * contract. The caller must resolve the provider card to a user-owned card.
 */
export function mapProviderBatchToImportPreview(
    batch: ProviderCardBatch,
    ownedCardId: string,
) {
    if (!ownedCardId.trim()) {
        throw new Error('An owned card mapping is required');
    }
    const normalized = normalizeCardImportBatch(batch);
    return {
        cardId: ownedCardId,
        transactions: normalized.transactions.map((transaction) => ({
            providerTransactionId: transaction.externalId,
            description: transaction.description,
            amountInCents: transaction.amountInCents.toString(),
            occurredAt: transaction.occurredAt.toISOString(),
        })),
        duplicateExternalIds: normalized.duplicateExternalIds,
    };
}
