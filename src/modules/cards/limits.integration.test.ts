import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { configureCardLimit, getCardLimitOverview } from './limits';

if (!(process.env.DATABASE_URL ?? '').includes('ec_finance_test')) {
    throw new Error('Card limits integration tests require ec_finance_test.');
}

const prisma = new PrismaClient();
const uid = randomUUID();

describe('PostgreSQL card limits', () => {
    let ownerId = '';
    let otherId = '';
    let cardId = '';

    beforeAll(async () => {
        const owner = await prisma.user.create({
            data: { email: `card-limit-owner-${uid}@example.test` },
        });
        const other = await prisma.user.create({
            data: { email: `card-limit-other-${uid}@example.test` },
        });
        ownerId = owner.id;
        otherId = other.id;
        const connection = await prisma.bankConnection.create({
            data: { userId: ownerId, provider: 'MANUAL', externalItemId: `limit-${uid}` },
        });
        const card = await prisma.creditCard.create({
            data: {
                userId: ownerId,
                connectionId: connection.id,
                externalAccountId: `limit-${uid}`,
                name: 'Card with limit',
            },
        });
        cardId = card.id;
        await prisma.transaction.create({
            data: {
                userId: ownerId, cardId,
                description: 'Groceries',
                providerTransactionId: `groceries-${uid}`,
                occurredAt: new Date('2026-11-15T12:00:00Z'),
                amountInCents: BigInt(50000),
            },
        });
        await prisma.invoicePayment.create({
            data: {
                userId: ownerId, cardId, period: '2026-11',
                amountInCents: BigInt(10000),
                idempotencyKey: `limit-payment-${uid}`,
                paidAt: new Date('2026-11-16T00:00:00Z'),
            },
        });
    });

    afterAll(async () => {
        if (ownerId && otherId) {
            await prisma.user.deleteMany({ where: { id: { in: [ownerId, otherId] } } });
        }
        await prisma.$disconnect();
    });

    it('persists owner limit and calculates recorded charge minus manual payment', async () => {
        await configureCardLimit(prisma, ownerId, cardId, {
            creditLimitInCents: '100000',
        });
        const result = await getCardLimitOverview(prisma, ownerId, cardId);
        expect(result).toEqual(expect.objectContaining({
            creditLimitInCents: BigInt(100000),
            estimatedUsedInCents: BigInt(40000),
            estimatedAvailableInCents: BigInt(60000),
        }));
    });

    it('does not allow another user to read or update the limit', async () => {
        await expect(getCardLimitOverview(prisma, otherId, cardId))
            .rejects.toThrow('Card not found');
        await expect(configureCardLimit(prisma, otherId, cardId, {
            creditLimitInCents: '1000',
        })).rejects.toThrow('Card not found');
    });

    it('rejects zero-valued credit limits at the database boundary', async () => {
        await expect(prisma.creditCard.update({
            where: { id: cardId },
            data: { creditLimitInCents: BigInt(0) },
        })).rejects.toThrow();
    });
});
