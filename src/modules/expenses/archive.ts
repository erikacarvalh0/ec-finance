import type { PrismaClient } from '@prisma/client';

type Database = Pick<PrismaClient, 'expense'>;

/**
 * Archive or restore an owned expense without deleting historical records.
 * updateMany combines ownership and archive-state checks atomically.
 */
export async function setExpenseArchived(
    database: Database,
    userId: string,
    recordId: string,
    archived: boolean,
): Promise<boolean> {
    if (!userId.trim() || !recordId.trim()) {
        throw new Error('Authenticated user and record ID are required');
    }

    const result = await database.expense.updateMany({
        where: {
            id: recordId,
            userId,
            archivedAt: archived ? null : { not: null },
        },
        data: { archivedAt: archived ? new Date() : null },
    });

    return result.count > 0;
}
