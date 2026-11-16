import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Prisma, PrismaClient } from '@prisma/client';
import { recordInvoicePayment, getInvoicePaymentSummary } from './payment-service';

if (!(process.env.DATABASE_URL ?? '').includes('ec_finance_test')) {
    throw new Error('Invoice payment integration tests require ec_finance_test.');
}

const prisma = new PrismaClient();
const runId = randomUUID();

describe('PostgreSQL invoice payment integrity', () => {
    let ownerId: string;
    let otherOwnerId: string;
    let cardId: string;

    beforeAll(async () => {
        const owner = await prisma.user.create({
            data: { email: `invoice-owner-${runId}@example.test` },
        });
        const otherOwner = await prisma.user.create({
            data: { email: `invoice-other-${runId}@example.test` },
        });
        ownerId = owner.id;
        otherOwnerId = otherOwner.id;

        const connection = await prisma.bankConnection.create({
            data: {
                userId: ownerId,
                provider: 'MANUAL',
                externalItemId: `invoice-${runId}`,
            },
        });
        const card = await prisma.creditCard.create({
            data: {
                userId: ownerId,
                connectionId: connection.id,
                externalAccountId: `invoice-card-${runId}`,
                name: 'Test invoice card',
                closingDay: 10,
                dueDay: 20,
            },
        });
        cardId = card.id;

        await prisma.transaction.create({
            data: {
                userId: ownerId,
                cardId,
                providerTransactionId: `invoice-charge-${runId}`,
                description: 'Test charge',
                amountInCents: BigInt(10000),
                occurredAt: new Date('2026-11-08T00:00:00.000Z'),
            },
        });
    });

    afterAll(async () => {
        if (ownerId && otherOwnerId) {
            await prisma.user.deleteMany({
                where: { id: { in: [ownerId, otherOwnerId] } },
            });
        }
        await prisma.$disconnect();
    });

    const makePayment = (
        userId: string,
        amountInCents: string,
        idempotencyKey: string,
    ) => prisma.$transaction(
        (tx) => recordInvoicePayment(tx, userId, cardId, '2026-11', {
            amountInCents,
            paidAt: '2026-11-16',
            idempotencyKey,
        }),
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    it('rejects payment attempts from another user without persisting anything', async () => {
        await expect(makePayment(
            otherOwnerId, '1000', `other-${runId}`,
        )).rejects.toThrow('Card not found');

        expect(await prisma.invoicePayment.count({
            where: { userId: otherOwnerId },
        })).toBe(0);
    });

    it('persists partial payments, is idempotent and settles the exact outstanding balance', async () => {
        const first = await makePayment(ownerId, '3500', `payment-a-${runId}`);
        const repeated = await makePayment(ownerId, '3500', `payment-a-${runId}`);

        expect(repeated.id).toBe(first.id);
        expect(await prisma.invoicePayment.count({
            where: { userId: ownerId, cardId },
        })).toBe(1);

        let summary = await getInvoicePaymentSummary(
            prisma, ownerId, cardId, '2026-11',
        );
        expect(summary.summary.status).toBe('PARTIALLY_PAID');
        expect(summary.summary.balanceInCents).toBe(BigInt(6500));

        await expect(makePayment(
            ownerId, '6501', `payment-excess-${runId}`,
        )).rejects.toThrow('Payment exceeds remaining invoice balance');

        await makePayment(ownerId, '6500', `payment-b-${runId}`);
        summary = await getInvoicePaymentSummary(
            prisma, ownerId, cardId, '2026-11',
        );

        expect(summary.summary.status).toBe('PAID');
        expect(summary.summary.paidInCents).toBe(BigInt(10000));
        expect(summary.summary.balanceInCents).toBe(BigInt(0));
    });

    it('prevents duplicate payment keys even through the database constraint', async () => {
        await expect(prisma.invoicePayment.create({
            data: {
                userId: ownerId,
                cardId,
                period: '2026-11',
                idempotencyKey: `payment-a-${runId}`,
                amountInCents: BigInt(100),
                paidAt: new Date('2026-11-16T00:00:00.000Z'),
            },
        })).rejects.toThrow();
    });

    it('rejects payments with another user card at the database boundary', async () => {
        await expect(prisma.invoicePayment.create({
            data: {
                userId: otherOwnerId,
                cardId,
                period: '2026-11',
                idempotencyKey: `foreign-${runId}`,
                amountInCents: BigInt(100),
                paidAt: new Date('2026-11-16T00:00:00.000Z'),
            },
        })).rejects.toThrow();
    });
});
