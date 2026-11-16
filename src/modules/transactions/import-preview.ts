import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { reconcileImportedTransactions } from './reconciliation';

type Database = Pick<PrismaClient, 'creditCard' | 'transaction'>;
const transactionSchema = z.object({
    providerTransactionId: z.string().trim().min(1).max(255),
    description: z.string().trim().min(1).max(255),
    amountInCents: z.string().regex(/^[1-9][0-9]*$/).max(19),
    occurredAt: z.iso.datetime({ offset: true }),
}).strict();
const batchSchema = z.array(transactionSchema).max(500);

export async function previewCardTransactionImport(
    database: Database,
    userId: string,
    cardId: string,
    input: unknown,
) {
    if (!userId.trim() || !cardId.trim()) {
        throw new Error('Authenticated user and card are required');
    }
    const parsed = batchSchema.parse(input);
    const candidates = parsed.map((item) => {
        const amountInCents = BigInt(item.amountInCents);
        if (amountInCents > BigInt('9223372036854775807')) {
            throw new Error('Transaction amount exceeds the supported range');
        }
        return {
            providerTransactionId: item.providerTransactionId,
            cardId,
            description: item.description,
            amountInCents,
            occurredAt: new Date(item.occurredAt),
        };
    });

    const card = await database.creditCard.findFirst({
        where: { id: cardId, userId }, select: { id: true },
    });
    if (!card) throw new Error('Credit card not found');

    if (candidates.length === 0) {
        return { toImport: [], duplicates: [], conflicts: [] };
    }

    const existing = await database.transaction.findMany({
        where: {
            userId,
            cardId,
            providerTransactionId: {
                in: [...new Set(candidates.map((item) => item.providerTransactionId))],
            },
        },
        select: {
            providerTransactionId: true,
            cardId: true,
            amountInCents: true,
        },
    });
    return reconcileImportedTransactions(candidates, existing);
}
