import type { Prisma, PrismaClient } from '@prisma/client';

export const incomePageSize = 20;
export type HistoryQuery = { type?: 'SALARY' | 'RECURRING' | 'OTHER'; search?: string; month?: string; categoryId?: string; archived: boolean; page?: string };

export function incomeHistoryWhere(userId: string, filters: HistoryQuery): Prisma.IncomeWhereInput {
    if (!userId.trim()) throw new Error('Authenticated user ID is required');
    const { type, search, month, categoryId, archived } = filters;
    const from = month && /^\d{4}-(0[1-9]|1[0-2])$/.test(month) ? new Date(month + '-01T00:00:00Z') : null;
    const to = from ? new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + 1, 1)) : null;
    return {
        userId, archivedAt: archived ? { not: null } : null,
        ...(type ? { type } : {}),
        ...(categoryId ? { categoryId } : {}),
        AND: [
            ...(search ? [{ OR: [{ description: { contains: search, mode: 'insensitive' as const } }, { responsible: { contains: search, mode: 'insensitive' as const } }] }] : []),
            ...(from && to ? [{ OR: [{ date: { gte: from, lt: to } }, { date: null, createdAt: { gte: from, lt: to } }] }] : []),
        ],
    };
}

export async function getPagedIncomeHistory(db: Pick<PrismaClient, 'income'>, userId: string, filters: HistoryQuery) {
    const where = incomeHistoryWhere(userId, filters);
    const total = await db.income.count({ where });
    const pages = Math.ceil(total / incomePageSize);
    const requested = Number(filters.page);
    const page = Math.min(Math.max(1, pages), Number.isSafeInteger(requested) && requested > 0 ? requested : 1);
    const incomes = await db.income.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * incomePageSize, take: incomePageSize });
    return { incomes, total, pages, page };
}
