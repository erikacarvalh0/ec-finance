import type { PrismaClient } from '@prisma/client';
import { normalizeCardImportBatch, type ProviderCardBatch } from './adapter';
import { mapProviderBatchToImportPreview } from './preview-mapping';

/**
 * Resolves a provider account to a user-owned card before generating import
 * candidates. Never trust a provider external account ID as an internal card ID.
 */
export async function previewOwnedProviderCardBatch(
    database: Pick<PrismaClient, 'creditCard'>,
    userId: string,
    connectionId: string,
    batch: ProviderCardBatch,
) {
    if (!userId.trim() || !connectionId.trim()) {
        throw new Error('Authenticated owner and bank connection are required');
    }
    const normalized = normalizeCardImportBatch(batch);
    const card = await database.creditCard.findFirst({
        where: {
            userId,
            connectionId,
            externalAccountId: normalized.cardExternalId,
        },
        select: { id: true },
    });
    if (!card) {
        throw new Error('Provider card not found');
    }
    return mapProviderBatchToImportPreview(batch, card.id);
}
