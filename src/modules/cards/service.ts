import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { buildCardInvoice } from './invoice';

type CardDatabase = Pick<PrismaClient, 'creditCard' | 'transaction' | 'expense'>;

const billingCycleSchema = z.object({
    closingDay: z.number().int().min(1).max(31),
    dueDay: z.number().int().min(1).max(31),
});

function requireOwner(userId: string, cardId: string): void {
    if (!userId.trim() || !cardId.trim()) {
        throw new Error('Authenticated user and card ID are required');
    }
}

export async function listUserCards(database: CardDatabase, userId: string) {
    requireOwner(userId, 'cards');

    return database.creditCard.findMany({
        where: { userId },
        select: {
            id: true,
            name: true,
            closingDay: true,
            dueDay: true,
        },
        orderBy: { name: 'asc' },
    });
}

export async function configureCardCycle(
    database: CardDatabase,
    userId: string,
    cardId: string,
    input: z.input<typeof billingCycleSchema>,
) {
    requireOwner(userId, cardId);
    const data = billingCycleSchema.parse(input);

    const card = await database.creditCard.findFirst({
        where: { id: cardId, userId },
        select: { id: true, closingDay: true, dueDay: true },
    });

    if (!card) {
        throw new Error('Card not found');
    }

    return database.creditCard.update({
        where: { id: cardId, userId },
        data,
    });
}

export async function getUserCardInvoice(
    database: CardDatabase,
    userId: string,
    cardId: string,
    period: string,
) {
    requireOwner(userId, cardId);

    const card = await database.creditCard.findFirst({
        where: { id: cardId, userId },
        select: {
            id: true,
            closingDay: true,
            dueDay: true,
        },
    });

    if (!card) {
        throw new Error('Card not found');
    }

    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) {
        throw new Error('Invalid invoice period');
    }

    const [year, month] = period.split('-').map(Number);
    const afterPreviousMonth = new Date(Date.UTC(year, month - 2, 1));
    const afterInvoiceMonth = new Date(Date.UTC(year, month, 1));
    const earliestInstallment = new Date(Date.UTC(year, month - 121, 1));

    const [purchases, expenses] = await Promise.all([
        database.transaction.findMany({
            where: {
                userId,
                cardId,
                occurredAt: { gte: afterPreviousMonth, lt: afterInvoiceMonth },
            },
            select: {
                id: true,
                description: true,
                amountInCents: true,
                occurredAt: true,
            },
        }),
        database.expense.findMany({
            where: {
                userId,
                cardId,
                paymentMethod: 'CREDIT',
                OR: [
                    { date: { gte: earliestInstallment, lt: afterInvoiceMonth } },
                    { date: null, createdAt: { gte: earliestInstallment, lt: afterInvoiceMonth } },
                ],
            },
            select: {
                id: true,
                description: true,
                amountInCents: true,
                installments: true,
                date: true,
                createdAt: true,
                linkedTransactionId: true,
            },
        }),
    ]);

    return buildCardInvoice(card, period, purchases, expenses);
}

export async function linkManualCardExpense(
    database: CardDatabase,
    userId: string,
    expenseId: string,
    transactionId: string,
) {
    requireOwner(userId, expenseId);

    if (!transactionId.trim()) {
        throw new Error('Transaction ID is required');
    }

    const [expense, transaction] = await Promise.all([
        database.expense.findFirst({
            where: { id: expenseId, userId },
            select: {
                id: true,
                cardId: true,
                paymentMethod: true,
                linkedTransactionId: true,
            },
        }),
        database.transaction.findFirst({
            where: { id: transactionId, userId },
            select: { id: true, cardId: true },
        }),
    ]);

    if (!expense || !transaction) {
        throw new Error('Record not found');
    }

    if (expense.paymentMethod !== 'CREDIT'
        || !expense.cardId
        || expense.cardId !== transaction.cardId) {
        throw new Error('Card mismatch');
    }

    return database.expense.update({
        where: { id: expenseId, userId },
        data: { linkedTransactionId: transactionId },
    });
}
