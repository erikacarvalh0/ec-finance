import type { PrismaClient } from '@prisma/client';

export async function bulkReclassifyTransactions(
    database: Pick<PrismaClient, '$transaction'>,
    userId: string,
    ids: string[],
    categoryId: string | null,
) {
    if (!userId.trim() || ids.length < 1 || ids.length > 100
        || ids.some(id => !id.trim()) || new Set(ids).size !== ids.length
        || (categoryId !== null && !categoryId.trim())) {
        throw new Error('Invalid bulk classification');
    }
    return database.$transaction(async tx => {
        if (categoryId !== null && !await tx.category.findFirst({
            where: { id: categoryId, userId }, select: { id: true },
        })) throw new Error('Category not found');
        const result = await tx.transaction.updateMany({
            where: { userId, id: { in: ids } }, data: { categoryId },
        });
        if (result.count !== ids.length) throw new Error('Transaction selection not found');
        return result.count;
    });
}
