import type { PrismaClient } from '@prisma/client';

type MonthlyDatabase = Pick<PrismaClient, 'expense' | 'transaction'>;

export async function getMonthlyFixedExpenses(
    database: MonthlyDatabase,
    userId: string,
    year: number,
    month: number,
) {
    if (!userId.trim() || !Number.isInteger(year)
        || !Number.isInteger(month) || month < 1 || month > 12) {
        throw new Error('Invalid monthly summary criteria');
    }

    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 1));

    const [expenses, cardTransactions] = await Promise.all([
        database.expense.findMany({
            where: {
                userId,
                type: 'FIXED',
                OR: [
                    { date: { gte: start, lt: end } },
                    { date: null, createdAt: { gte: start, lt: end } },
                ],
            },
            select: {
                id: true,
                description: true,
                amountInCents: true,
                date: true,
            },
        }),
        database.transaction.findMany({
            where: {
                userId,
                isFixed: true,
                occurredAt: { gte: start, lt: end },
            },
            select: {
                id: true,
                description: true,
                amountInCents: true,
                occurredAt: true,
            },
        }),
    ]);

    return {
        expenses,
        cardTransactions,
        totalInCents: [...expenses, ...cardTransactions].reduce(
            (total, expense) => total + expense.amountInCents,
            BigInt(0),
        ),
    };
}
