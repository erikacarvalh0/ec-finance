import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';

type Database = Pick<PrismaClient, 'income'>;

const filtersSchema = z.object({
    type: z.enum(['SALARY', 'RECURRING', 'OTHER']).optional(),
    search: z.string().trim().max(100).optional(),
    archived: z.boolean().optional(),
    cursor: z.string().min(1).max(200).optional(),
});

export type IncomeHistoryFilters = z.input<typeof filtersSchema>;

export function parseIncomeHistoryFilters(input: IncomeHistoryFilters) {
    const parsed = filtersSchema.parse(input);

    return {
        type: parsed.type,
        search: parsed.search || undefined,
        archived: parsed.archived,
        cursor: parsed.cursor,
    };
}

export async function listFilteredIncomes(
    database: Database,
    userId: string,
    filters: IncomeHistoryFilters,
) {
    if (!userId.trim()) {
        throw new Error('Authenticated user ID is required');
    }

    const { type, search, cursor, archived } = parseIncomeHistoryFilters(filters);
    const rows = await database.income.findMany({
        where: {
            userId,
            archivedAt: archived ? { not: null } : null,
            ...(type ? { type } : {}),
            ...(search ? {
                OR: [
                    { description: { contains: search, mode: 'insensitive' } },
                    { responsible: { contains: search, mode: 'insensitive' } },
                ],
            } : {}),
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 21,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasNext = rows.length > 20;
    const incomes = rows.slice(0, 20);

    return {
        incomes,
        nextCursor: hasNext ? incomes.at(-1)?.id ?? null : null,
    };
}
