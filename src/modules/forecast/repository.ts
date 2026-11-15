import type { PrismaClient } from '@prisma/client';
import { buildMonthlyForecast } from './schedule';

type ForecastDatabase = Pick<PrismaClient, 'expense' | 'income'>;

export async function getUserCashflowForecast(
    database: ForecastDatabase,
    userId: string,
    start: Date,
    months = 6,
) {
    if (!userId.trim()) {
        throw new Error('Authenticated user ID is required');
    }

    const [expenses, incomes] = await Promise.all([
        database.expense.findMany({
            where: {
                userId,
                OR: [
                    { date: { lt: new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + months, 1)) } },
                    { date: null },
                ],
            },
            select: {
                id: true,
                description: true,
                amountInCents: true,
                paymentMethod: true,
                type: true,
                date: true,
                installments: true,
                createdAt: true,
            },
        }),
        database.income.findMany({
            where: {
                userId,
                OR: [
                    { date: { lt: new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + months, 1)) } },
                    { date: null },
                ],
            },
            select: {
                id: true,
                description: true,
                amountInCents: true,
                type: true,
                date: true,
                createdAt: true,
            },
        }),
    ]);

    return buildMonthlyForecast({
        start,
        monthCount: months,
        expenses,
        incomes,
    });
}
