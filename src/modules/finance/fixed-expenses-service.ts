import type { PrismaClient } from '@prisma/client';
import { normalizeMerchant } from './fixed-expenses';

type Database = Pick<
    PrismaClient,
    'transaction' | 'fixedExpenseRule'
>;

export async function markCardTransactionFixed(
    database: Database,
    userId: string,
    transactionId: string,
) {
    if (!userId.trim()) {
        throw new Error('Authenticated user ID is required');
    }

    const transaction = await database.transaction.findFirst({
        where: { id: transactionId, userId },
        select: { cardId: true, description: true },
    });

    if (!transaction) {
        throw new Error('Transaction not found');
    }

    const merchantKey = normalizeMerchant(transaction.description);

    if (!merchantKey) {
        throw new Error('Merchant description is required');
    }

    await database.fixedExpenseRule.upsert({
        where: {
            userId_cardId_merchantKey: {
                userId,
                cardId: transaction.cardId,
                merchantKey,
            },
        },
        create: {
            userId,
            cardId: transaction.cardId,
            merchantKey,
        },
        update: {},
    });

    return database.transaction.update({
        where: { id: transactionId, userId },
        data: { isFixed: true },
    });
}

export async function classifyImportedCardTransaction(
    database: Database,
    transaction: {
        userId: string;
        cardId: string;
        description: string;
    },
): Promise<boolean> {
    const merchantKey = normalizeMerchant(transaction.description);

    if (!merchantKey) {
        return false;
    }

    const rule = await database.fixedExpenseRule.findUnique({
        where: {
            userId_cardId_merchantKey: {
                userId: transaction.userId,
                cardId: transaction.cardId,
                merchantKey,
            },
        },
        select: { id: true },
    });

    return Boolean(rule);
}
