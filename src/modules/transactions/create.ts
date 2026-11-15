import { randomUUID } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';

type TransactionDatabase = Pick<PrismaClient, 'transaction' | 'creditCard' | 'category'>;

export class MissingOwnedResourceError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'MissingOwnedResourceError';
    }
}

const manualTransactionSchema = z.object({
    cardId: z.string().trim().min(1),
    categoryId: z.string().trim().min(1).nullable().optional(),
    description: z.string().trim().min(1).max(255),
    amountInCents: z.string().regex(/^[1-9][0-9]*$/).max(18),
    occurredAt: z.iso.datetime({ offset: true }),
});

export type ManualTransactionInput = z.input<typeof manualTransactionSchema>;

export async function createManualTransaction(
    database: TransactionDatabase,
    userId: string,
    input: ManualTransactionInput,
) {
    if (!userId.trim()) {
        throw new Error('Authenticated user ID is required');
    }

    const parsed = manualTransactionSchema.parse(input);
    const amountInCents = BigInt(parsed.amountInCents);

    if (amountInCents > BigInt('9223372036854775807')) {
        throw new Error('Transaction amount exceeds the supported range');
    }

    const card = await database.creditCard.findFirst({
        where: {
            id: parsed.cardId,
            userId,
        },
        select: {
            id: true,
        },
    });

    if (!card) {
        throw new MissingOwnedResourceError('Credit card not found');
    }

    if (parsed.categoryId) {
        const category = await database.category.findFirst({
            where: {
                id: parsed.categoryId,
                userId,
            },
            select: {
                id: true,
            },
        });

        if (!category) {
            throw new MissingOwnedResourceError('Category not found');
        }
    }

    return database.transaction.create({
        data: {
            userId,
            cardId: parsed.cardId,
            categoryId: parsed.categoryId ?? null,
            description: parsed.description,
            amountInCents,
            occurredAt: new Date(parsed.occurredAt),
            providerTransactionId: `manual:${randomUUID()}`,
        },
        select: {
            id: true,
            cardId: true,
            categoryId: true,
            description: true,
            amountInCents: true,
            occurredAt: true,
        },
    });
}
