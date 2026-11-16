import { z } from 'zod';
import type { PrismaClient } from '@prisma/client';
import { getUserCardInvoice } from './service';
import { summarizeInvoicePayments } from './payments';

export type PaymentDatabase = Pick<
    PrismaClient,
    'creditCard' | 'transaction' | 'expense' | 'invoicePayment'
>;

const paymentSchema = z.object({
    amountInCents: z.string().regex(/^[1-9][0-9]*$/).max(18),
    paidAt: z.iso.date(),
    idempotencyKey: z.string().trim().min(8).max(128),
});

export type InvoicePaymentInput = z.input<typeof paymentSchema>;

function parsePeriod(period: string): Date {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) {
        throw new Error('Invalid invoice period');
    }

    const [year, month] = period.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, 1));

    if (date.getUTCFullYear() !== year) {
        throw new Error('Invalid invoice period');
    }

    return date;
}

function invoiceClosingDate(period: string, closingDay: number): Date {
    const start = parsePeriod(period);
    const last = new Date(Date.UTC(
        start.getUTCFullYear(),
        start.getUTCMonth() + 1,
        0,
    )).getUTCDate();

    return new Date(Date.UTC(
        start.getUTCFullYear(),
        start.getUTCMonth(),
        Math.min(closingDay, last),
    ));
}

export async function getInvoicePaymentSummary(
    database: PaymentDatabase,
    userId: string,
    cardId: string,
    period: string,
    now = new Date(),
) {
    if (!userId.trim() || !cardId.trim()) {
        throw new Error('Authenticated user and card ID are required');
    }

    const invoice = await getUserCardInvoice(database, userId, cardId, period);
    const card = await database.creditCard.findFirst({
        where: { id: cardId, userId },
        select: { id: true, closingDay: true },
    });

    if (!card?.closingDay) {
        throw new Error('Card billing cycle is not configured');
    }

    const payments = await database.invoicePayment.findMany({
        where: { userId, cardId, period },
        orderBy: [{ paidAt: 'asc' }, { createdAt: 'asc' }],
        select: {
            id: true,
            amountInCents: true,
            paidAt: true,
            createdAt: true,
        },
    });

    return {
        invoice,
        payments,
        summary: summarizeInvoicePayments(
            invoice,
            payments,
            now,
            invoiceClosingDate(period, card.closingDay),
        ),
    };
}

export async function recordInvoicePayment(
    database: PaymentDatabase,
    userId: string,
    cardId: string,
    period: string,
    input: InvoicePaymentInput,
) {
    if (!userId.trim() || !cardId.trim()) {
        throw new Error('Authenticated user and card ID are required');
    }

    parsePeriod(period);
    const payload = paymentSchema.parse(input);
    const amountInCents = BigInt(payload.amountInCents);

    if (amountInCents > BigInt('9223372036854775807')) {
        throw new Error('Payment exceeds the supported range');
    }

    const existing = await database.invoicePayment.findUnique({
        where: {
            userId_cardId_idempotencyKey: {
                userId,
                cardId,
                idempotencyKey: payload.idempotencyKey,
            },
        },
    });

    if (existing) {
        if (existing.period !== period
            || existing.amountInCents !== amountInCents
            || existing.paidAt.toISOString().slice(0, 10) !== payload.paidAt) {
            throw new Error('Payment request key already used');
        }

        return existing;
    }

    const { summary } = await getInvoicePaymentSummary(
        database,
        userId,
        cardId,
        period,
    );

    if (amountInCents > summary.balanceInCents) {
        throw new Error('Payment exceeds remaining invoice balance');
    }

    return database.invoicePayment.create({
        data: {
            userId,
            cardId,
            period,
            idempotencyKey: payload.idempotencyKey,
            amountInCents,
            paidAt: new Date(`${payload.paidAt}T00:00:00.000Z`),
        },
    });
}
