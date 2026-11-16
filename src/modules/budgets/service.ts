import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { monthBounds, summarizeCategoryBudgets } from './calculations';

export type BudgetDatabase = Pick<
    PrismaClient,
    'category' | 'categoryBudget' | 'expense' | 'transaction'
>;

const budgetSchema = z.object({
    categoryId: z.string().trim().min(1),
    period: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
    limitInCents: z.string().regex(/^[1-9][0-9]*$/).max(18),
});

export async function setCategoryBudget(
    database: BudgetDatabase,
    userId: string,
    input: z.input<typeof budgetSchema>,
) {
    if (!userId.trim()) {
        throw new Error('Authenticated user is required');
    }

    const parsed = budgetSchema.parse(input);
    monthBounds(parsed.period);
    const limitInCents = BigInt(parsed.limitInCents);

    if (limitInCents > BigInt('9223372036854775807')) {
        throw new Error('Budget amount exceeds supported range');
    }

    const category = await database.category.findFirst({
        where: { id: parsed.categoryId, userId },
        select: { id: true },
    });

    if (!category) {
        throw new Error('Category not found');
    }

    return database.categoryBudget.upsert({
        where: {
            userId_categoryId_period: {
                userId,
                categoryId: parsed.categoryId,
                period: parsed.period,
            },
        },
        create: {
            userId,
            categoryId: parsed.categoryId,
            period: parsed.period,
            limitInCents,
        },
        update: { limitInCents },
    });
}

export async function getCategoryBudgetReport(
    database: BudgetDatabase,
    userId: string,
    period: string,
) {
    if (!userId.trim()) {
        throw new Error('Authenticated user is required');
    }

    const { start, end } = monthBounds(period);
    const [categories, budgets, expenses, transactions] = await Promise.all([
        database.category.findMany({
            where: { userId },
            select: { id: true, name: true },
            orderBy: { name: 'asc' },
        }),
        database.categoryBudget.findMany({
            where: { userId, period },
            select: { categoryId: true, limitInCents: true, rolloverInCents: true, rolloverAppliedAt: true },
        }),
        database.expense.findMany({
            where: {
                userId,
                OR: [
                    { date: { gte: start, lt: end } },
                    { date: null, createdAt: { gte: start, lt: end } },
                ],
            },
            select: {
                id: true,
                categoryId: true,
                amountInCents: true,
                linkedTransactionId: true,
            },
        }),
        database.transaction.findMany({
            where: { userId, occurredAt: { gte: start, lt: end } },
            select: { id: true, categoryId: true, amountInCents: true },
        }),
    ]);

    return {
        period,
        categories: summarizeCategoryBudgets({
            categories,
            budgets: budgets.map(budget => ({
                ...budget,
                limitInCents: budget.limitInCents + (budget.rolloverInCents ?? BigInt(0)),
            })),
            expenses, transactions,
        }).map(row => ({
            ...row,
            rolloverApplied: budgets.some(budget => budget.categoryId === row.categoryId
                && budget.rolloverAppliedAt != null),
        })),
    };
}
