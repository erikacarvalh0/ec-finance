import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';

type Database = Pick<PrismaClient, 'expense'>;

const filters = z.object({
    type: z.enum(['FIXED', 'VARIABLE']).optional(),
    paymentMethod: z.enum(['PIX', 'CREDIT', 'DEBIT', 'AUTOMATIC_DEBIT', 'OTHER']).optional(),
    search: z.string().trim().max(100).optional(),
    cursor: z.string().trim().min(1).max(200).optional(),
});

export type ExpenseHistoryFilters = z.input<typeof filters>;

export function parseExpenseHistoryFilters(input: ExpenseHistoryFilters) {
    const parsed = filters.parse(input);

    return {
        type: parsed.type,
        paymentMethod: parsed.paymentMethod,
        search: parsed.search || undefined,
        cursor: parsed.cursor,
    };
}

export async function listFilteredExpenses(
    database: Database,
    userId: string,
    filtersInput: ExpenseHistoryFilters,
) {
    if (!userId.trim()) {
        throw new Error('Authenticated user ID is required');
    }

    const { type, paymentMethod, search, cursor } = parseExpenseHistoryFilters(filtersInput);
    const rows = await database.expense.findMany({
        where: {
            userId,
            ...(type ? { type } : {}),
            ...(paymentMethod ? { paymentMethod } : {}),
            ...(search ? {
                description: { contains: search, mode: 'insensitive' },
            } : {}),
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 21,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    const expenses = rows.slice(0, 20);

    return {
        expenses,
        nextCursor: rows.length > 20 ? expenses.at(-1)?.id ?? null : null,
    };
}
