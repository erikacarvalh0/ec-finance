import type { PrismaClient } from '@prisma/client';

type Database = Pick<PrismaClient, 'income'>;

/**
 * Archive or restore an owned income without deleting historical records.
 * updateMany combines ownership and archive-state checks atomically.
 */
export async function setIncomeArchived(
    database: Database,
    userId: string,
    recordId: string,
    archived: boolean,
): Promise<boolean> {
    if (!userId.trim() || !recordId.trim()) {
        throw new Error('Authenticated user and record ID are required');
    }

    const result = await database.income.updateMany({
        where: {
            id: recordId,
            userId,
            archivedAt: archived ? null : { not: null },
        },
        data: { archivedAt: archived ? new Date() : null },
    });

    return result.count > 0;
}
