import type { PrismaClient } from '@prisma/client';
import { buildMonthlyForecast } from './schedule';
import { reconcileForecast } from './reconcile';

type ForecastDatabase = Pick<
    PrismaClient,
    'expense' | 'income' | 'expenseOccurrence' | 'incomeOccurrence'
>;

export async function getUserCashflowForecast(
    database: ForecastDatabase,
    userId: string,
    start: Date,
    months = 6,
) {
    if (!userId.trim()) {
        throw new Error('Authenticated user ID is required');
    }

    if (!Number.isInteger(months) || months < 1 || months > 24
        || Number.isNaN(start.getTime())) {
        throw new Error('Invalid forecast window');
    }

    const end = new Date(Date.UTC(
        start.getUTCFullYear(),
        start.getUTCMonth() + months,
        1,
    ));

    const [expenses, incomes, expenseAdjustments, incomeAdjustments] = await Promise.all([
        database.expense.findMany({
            where: {
                userId,
                OR: [
                    { date: { lt: end } },
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
                    { date: { lt: end } },
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
        database.expenseOccurrence.findMany({
            where: {
                userId,
                dueMonth: {
                    gte: new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1)),
                    lt: end,
                },
            },
            select: {
                expenseId: true,
                dueMonth: true,
                status: true,
                actualAmountInCents: true,
            },
        }),
        database.incomeOccurrence.findMany({
            where: {
                userId,
                dueMonth: {
                    gte: new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1)),
                    lt: end,
                },
            },
            select: {
                incomeId: true,
                dueMonth: true,
                status: true,
                actualAmountInCents: true,
            },
        }),
    ]);

    return reconcileForecast(buildMonthlyForecast({
        start,
        monthCount: months,
        expenses,
        incomes,
    }), expenseAdjustments, incomeAdjustments);
}
