import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { buildMonthlyForecast, type ForecastExpense } from '../forecast/schedule';

export function matchesDueMonth(expense: ForecastExpense & { occurrences: Array<{ dueMonth: Date; status: string }> }, month: Date, status?: string) {
    const scheduled = buildMonthlyForecast({ start: month, monthCount: 1, expenses: [expense], incomes: [] })[0].expenses.length > 0;
    if (!scheduled) return false;
    const key = month.toISOString().slice(0, 7);
    const occurrence = expense.occurrences.find(item => item.dueMonth.toISOString().slice(0, 7) === key);
    return !status || (occurrence?.status ?? 'PENDING') === status;
}

type Database = Pick<PrismaClient, 'expense'>;

const filters = z.object({
    type: z.enum(['FIXED', 'VARIABLE']).optional(),
    paymentMethod: z.enum(['PIX', 'CREDIT', 'DEBIT', 'AUTOMATIC_DEBIT', 'OTHER']).optional(),
    search: z.string().trim().max(100).optional(),
    month: z.string().regex(/^[1-9]\d{3}-(0[1-9]|1[0-2])$/).optional(),
    categoryId: z.string().trim().min(1).max(200).optional(),
    status: z.enum(['PENDING', 'SETTLED', 'CANCELED']).optional(),
    archived: z.boolean().optional(),
    cursor: z.string().trim().max(200).transform((value) => value || undefined).optional(),
});

export type ExpenseHistoryFilters = z.input<typeof filters>;

export function parseExpenseHistoryFilters(input: ExpenseHistoryFilters) {
    const parsed = filters.parse(input);

    return {
        type: parsed.type,
        paymentMethod: parsed.paymentMethod,
        search: parsed.search || undefined,
        ...(parsed.month ? { month: parsed.month } : {}),
        ...(parsed.categoryId ? { categoryId: parsed.categoryId } : {}),
        ...(parsed.status ? { status: parsed.status } : {}),
        archived: parsed.archived,
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

    const { type, paymentMethod, search, cursor, archived, month, categoryId, status } = parseExpenseHistoryFilters(filtersInput);
    const start = month ? new Date(`${month}-01T00:00:00Z`) : status ? new Date(new Date().toISOString().slice(0, 7) + '-01T00:00:00Z') : undefined;
    const end = start ? new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1)) : undefined;
    const query = {
        where: {
            userId,
            archivedAt: archived ? { not: null } : null,
            ...(categoryId ? { categoryId } : {}),
            ...(start && end ? {
                OR: [
                    { date: { lt: end } },
                    { date: null, createdAt: { lt: end } },
                ],
            } : {}),
            ...(type ? { type } : {}),
            ...(paymentMethod ? { paymentMethod } : {}),
            ...(search ? {
                description: { contains: search, mode: 'insensitive' as const },
            } : {}),
        },
        orderBy: [{ createdAt: 'desc' as const }, { id: 'desc' as const }],
    };
    let rows;
    if (start) {
        const matches = [];
        let scanCursor = cursor;
        while (matches.length < 21) {
            const batch = await database.expense.findMany({
                ...query,
                include: { occurrences: { where: { userId, dueMonth: start } } },
                take: 100,
                ...(scanCursor ? { cursor: { id: scanCursor }, skip: 1 } : {}),
            });
            matches.push(...batch.filter(expense => matchesDueMonth(expense, start, status)));
            if (batch.length < 100) break;
            scanCursor = batch.at(-1)?.id;
        }
        rows = matches.slice(0, 21);
    } else {
        rows = await database.expense.findMany({ ...query, take: 21, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}) });
    }
    const expenses = rows.slice(0, 20);

    return {
        expenses,
        nextCursor: rows.length > 20 ? expenses.at(-1)?.id ?? null : null,
    };
}
