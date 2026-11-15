import type { PrismaClient } from '@prisma/client';

export type TransactionsDatabase = Pick<PrismaClient, 'transaction'>;

export async function listUserTransactions(
    database: TransactionsDatabase,
    authenticatedUserId: string,
) {
    if (!authenticatedUserId.trim()) {
        throw new Error('Authenticated user ID is required');
    }

    return database.transaction.findMany({
        where: {
            userId: authenticatedUserId,
        },
        orderBy: {
            occurredAt: 'desc',
        },
        take: 50,
        select: {
            id: true,
            description: true,
            amountInCents: true,
            occurredAt: true,
            categoryId: true,
        },
    });
}
