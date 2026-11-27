import type { PrismaClient } from '@prisma/client';
import type { z } from 'zod';
import {
    expenseInputSchema,
    incomeInputSchema,
    investmentInputSchema,
    investmentSnapshotInputSchema,
} from './validation';

export type FinanceDatabase = Pick<
    PrismaClient,
    'expense' | 'income' | 'investment' | 'investmentSnapshot' | 'investmentCashflow' | 'creditCard' | 'category'
>;

function requireOwner(userId: string): void {
    if (!userId.trim()) {
        throw new Error('Authenticated user ID is required');
    }
}

function parseMoney(amount: string): bigint {
    const cents = BigInt(amount);

    if (cents > BigInt('9223372036854775807')) {
        throw new Error('Amount exceeds the supported range');
    }

    return cents;
}

function toDate(date: string): Date {
    return new Date(date + 'T00:00:00.000Z');
}

export async function createExpense(
    database: FinanceDatabase,
    userId: string,
    input: z.input<typeof expenseInputSchema>,
) {
    requireOwner(userId);
    const data = expenseInputSchema.parse(input);

    if (data.cardId) {
        const card = await database.creditCard.findFirst({
            where: { id: data.cardId, userId },
            select: { id: true },
        });

        if (!card) {
            throw new Error('Card not found');
        }
    }

    if (data.categoryId) {
        const category = await database.category.findFirst({
            where: { id: data.categoryId, userId, type: 'EXPENSE' },
            select: { id: true },
        });

        if (!category) {
            throw new Error('Category not found');
        }
    }

    return database.expense.create({
        data: {
            userId,
            description: data.description,
            amountInCents: parseMoney(data.amountInCents),
            paymentMethod: data.paymentMethod,
            type: data.type,
            date: data.date ? toDate(data.date) : null,
            installments: data.installments,
            ...(data.cardId ? { cardId: data.cardId } : {}),
            ...(data.categoryId ? { categoryId: data.categoryId } : {}),
        },
    });
}

export async function createIncome(
    database: FinanceDatabase,
    userId: string,
    input: z.input<typeof incomeInputSchema>,
) {
    requireOwner(userId);
    const data = incomeInputSchema.parse(input);

    if (data.categoryId && !await database.category.findFirst({
        where: { id: data.categoryId, userId, type: 'INCOME' },
        select: { id: true },
    })) throw new Error('Category not found');

    return database.income.create({
        data: {
            userId,
            type: data.type,
            amountInCents: parseMoney(data.amountInCents),
            ...(data.categoryId ? { categoryId: data.categoryId } : {}),
            responsible: data.type === 'RECURRING' ? data.responsible ?? null : null,
            description: data.type !== 'SALARY' ? data.description ?? null : null,
            date: data.type !== 'SALARY' && data.date ? toDate(data.date) : null,
        },
    });
}

export async function createInvestment(
    database: FinanceDatabase,
    userId: string,
    input: z.input<typeof investmentInputSchema>,
) {
    requireOwner(userId);
    const data = investmentInputSchema.parse(input);

    return database.investment.create({
        data: {
            userId,
            name: data.name,
            ...(data.type ? { type: data.type } : {}),
            ...(data.institution ? { institution: data.institution } : {}),
            ...(data.product ? { product: data.product } : {}),
            ...(data.appliedAt ? { appliedAt: toDate(data.appliedAt) } : {}),
            ...(data.maturityAt ? { maturityAt: toDate(data.maturityAt) } : {}),
            ...(data.contractedRate ? { contractedRate: data.contractedRate } : {}),
            ...(data.amountInCents && data.appliedAt ? { snapshots: { create: { userId, amountInCents: parseMoney(data.amountInCents), recordedAt: toDate(data.appliedAt) } } } : {}),
        },
    });
}

export async function addInvestmentSnapshot(
    database: FinanceDatabase,
    userId: string,
    investmentId: string,
    input: z.input<typeof investmentSnapshotInputSchema>,
) {
    requireOwner(userId);
    const data = investmentSnapshotInputSchema.parse(input);
    const investment = await database.investment.findFirst({
        where: {
            id: investmentId,
            userId,
        },
        select: {
            id: true,
        },
    });

    if (!investment) {
        throw new Error('Investment not found');
    }

    return database.investmentSnapshot.create({
        data: {
            userId,
            investmentId,
            amountInCents: parseMoney(data.amountInCents),
            recordedAt: toDate(data.recordedAt),
        },
    });
}

export async function listExpenses(database: FinanceDatabase, userId: string) {
    requireOwner(userId);

    return database.expense.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 100,
    });
}

export async function listIncomes(database: FinanceDatabase, userId: string) {
    requireOwner(userId);

    return database.income.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 100,
    });
}

export async function listInvestments(database: FinanceDatabase, userId: string) {
    requireOwner(userId);

    return database.investment.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        include: {
            snapshots: {
                orderBy: [{ recordedAt: 'asc' }, { createdAt: 'asc' }],
            },
            cashflows: {
                orderBy: [{ occurredAt: 'asc' }, { createdAt: 'asc' }],
            },
        },
    });
}
