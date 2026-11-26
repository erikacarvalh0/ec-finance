import type { PrismaClient } from '@prisma/client';

export async function deleteArchivedExpense(database: Pick<PrismaClient, 'expense'>, userId: string, id: string) {
    if (!userId.trim() || !id.trim()) return 'not-found';
    const result = await database.expense.deleteMany({
        where: {
            id,
            userId,
            archivedAt: { not: null },
            linkedTransactionId: null,
            occurrences: { none: {} },
        },
    });
    if (result.count === 1) return 'deleted';
    const existing = await database.expense.findFirst({ where: { id, userId }, select: { id: true } });
    return existing ? 'protected' : 'not-found';
}
