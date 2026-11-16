import type { PrismaClient } from '@prisma/client';
import type { ProviderCardBatch } from './adapter';
import { previewOwnedProviderCardBatch } from './owned-card-preview';
import { previewCardTransactionImport } from '@/modules/transactions/import-preview';

type Database = Pick<PrismaClient, 'creditCard' | 'transaction'>;

const serialize = (item: { amountInCents: bigint }) => ({
    ...item,
    amountInCents: item.amountInCents.toString(),
});

/**
 * Produces an owner-scoped, read-only reconciliation preview for a provider
 * batch. External IDs are never accepted as internal card IDs.
 */
export async function previewReconciledProviderBatch(
    database: Database,
    userId: string,
    connectionId: string,
    batch: ProviderCardBatch,
) {
    const mapped = await previewOwnedProviderCardBatch(
        database, userId, connectionId, batch,
    );
    const preview = await previewCardTransactionImport(
        database, userId, mapped.cardId, mapped.transactions,
    );
    return {
        cardId: mapped.cardId,
        duplicateExternalIds: mapped.duplicateExternalIds,
        toImport: preview.toImport.map(serialize),
        duplicates: preview.duplicates.map(serialize),
        conflicts: preview.conflicts.map((conflict) => ({
            candidate: serialize(conflict.candidate),
            existing: {
                ...conflict.existing,
                ...(conflict.existing.amountInCents === undefined
                    ? {} : { amountInCents: conflict.existing.amountInCents.toString() }),
            },
        })),
    };
}
