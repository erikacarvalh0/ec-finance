import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { reconcileImportedTransactions } from './reconciliation';

const itemSchema = z.object({
    providerTransactionId: z.string().trim().min(1).max(255),
    description: z.string().trim().min(1).max(255),
    amountInCents: z.string().regex(/^[1-9][0-9]*$/).max(19),
    occurredAt: z.iso.datetime({ offset: true }),
}).strict();

export async function importCardTransactions(
    database: Pick<PrismaClient, '$transaction'>,
    userId: string,
    cardId: string,
    input: unknown,
) {
    if (!userId.trim() || !cardId.trim()) {
        throw new Error('Authenticated user and card are required');
    }
    const parsed = z.array(itemSchema).max(500).parse(input);
    const candidates = parsed.map((item) => {
        const amountInCents = BigInt(item.amountInCents);
        if (amountInCents > BigInt('9223372036854775807')) {
            throw new Error('Transaction amount exceeds the supported range');
        }
        return {
            cardId, providerTransactionId: item.providerTransactionId,
            description: item.description, amountInCents,
            occurredAt: new Date(item.occurredAt),
        };
    });

    return database.$transaction(async (transaction) => {
        const card = await transaction.creditCard.findFirst({
            where: { id: cardId, userId }, select: { id: true },
        });
        if (!card) throw new Error('Credit card not found');
        if (candidates.length === 0) {
            return { importedCount: 0, duplicateCount: 0 };
        }

        const existing = await transaction.transaction.findMany({
            where: {
                userId, cardId,
                providerTransactionId: {
                    in: [...new Set(candidates.map((item) => item.providerTransactionId))],
                },
            },
            select: { providerTransactionId: true, cardId: true, amountInCents: true },
        });
        const preview = reconcileImportedTransactions(candidates, existing);
        if (preview.conflicts.length > 0) {
            throw new Error('Conflicting imported transactions');
        }
        if (preview.toImport.length === 0) {
            return { importedCount: 0, duplicateCount: preview.duplicates.length };
        }
        const created = await transaction.transaction.createMany({
            data: preview.toImport.map((item) => ({
                userId, cardId, providerTransactionId: item.providerTransactionId,
                description: item.description, amountInCents: item.amountInCents,
                occurredAt: item.occurredAt,
            })),
            skipDuplicates: true,
        });
        return {
            importedCount: created.count,
            duplicateCount: preview.duplicates.length + preview.toImport.length - created.count,
        };
    });
}
