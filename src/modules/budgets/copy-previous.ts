import type { PrismaClient } from '@prisma/client';
import { monthBounds } from './calculations';

type Database = Pick<PrismaClient, 'categoryBudget'>;

export function previousBudgetPeriod(period: string): string {
    const { start } = monthBounds(period);
    const previous = new Date(Date.UTC(
        start.getUTCFullYear(),
        start.getUTCMonth() - 1,
        1,
    ));
    return `${previous.getUTCFullYear()}-${String(previous.getUTCMonth() + 1).padStart(2, '0')}`;
}

export async function copyPreviousMonthBudgets(
    database: Database,
    userId: string,
    targetPeriod: string,
) {
    if (!userId.trim()) {
        throw new Error('Authenticated user is required');
    }
    const sourcePeriod = previousBudgetPeriod(targetPeriod);
    const source = await database.categoryBudget.findMany({
        where: { userId, period: sourcePeriod },
        select: { categoryId: true, limitInCents: true },
    });
    if (source.length === 0) {
        return { sourcePeriod, targetPeriod, copied: 0, found: 0 };
    }

    const result = await database.categoryBudget.createMany({
        data: source.map(budget => ({
            userId,
            categoryId: budget.categoryId,
            period: targetPeriod,
            limitInCents: budget.limitInCents,
        })),
        // Existing target limits are user-defined: never overwrite them.
        skipDuplicates: true,
    });
    return { sourcePeriod, targetPeriod, copied: result.count, found: source.length };
}
