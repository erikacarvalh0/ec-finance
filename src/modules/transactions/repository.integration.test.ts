import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { listUserTransactions } from './repository';

const databaseUrl = process.env.DATABASE_URL ?? '';

if (!databaseUrl.includes('ec_finance_test')) {
    throw new Error(
        'Integration tests require a dedicated ec_finance_test PostgreSQL database.',
    );
}

const prisma = new PrismaClient();
const runId = randomUUID();

describe('PostgreSQL tenant isolation', () => {
    let ownerId: string;
    let otherUserId: string;
    let ownerConnectionId: string;
    let otherConnectionId: string;
    let ownerCardId: string;
    let otherCardId: string;
    let otherCategoryId: string;

    beforeAll(async () => {
        const owner = await prisma.user.create({
            data: {
                email: `owner-${runId}@example.test`,
            },
        });
        const otherUser = await prisma.user.create({
            data: {
                email: `other-${runId}@example.test`,
            },
        });

        ownerId = owner.id;
        otherUserId = otherUser.id;

        const ownerConnection = await prisma.bankConnection.create({
            data: {
                userId: ownerId,
                provider: 'test-provider',
                externalItemId: `owner-${runId}`,
            },
        });
        const otherConnection = await prisma.bankConnection.create({
            data: {
                userId: otherUserId,
                provider: 'test-provider',
                externalItemId: `other-${runId}`,
            },
        });

        ownerConnectionId = ownerConnection.id;
        otherConnectionId = otherConnection.id;

        const ownerCard = await prisma.creditCard.create({
            data: {
                userId: ownerId,
                connectionId: ownerConnectionId,
                externalAccountId: `owner-card-${runId}`,
                name: 'Owner credit card',
            },
        });
        const otherCard = await prisma.creditCard.create({
            data: {
                userId: otherUserId,
                connectionId: otherConnectionId,
                externalAccountId: `other-card-${runId}`,
                name: 'Other credit card',
            },
        });

        ownerCardId = ownerCard.id;
        otherCardId = otherCard.id;

        const otherCategory = await prisma.category.create({
            data: {
                userId: otherUserId,
                name: `Other category ${runId}`,
            },
        });
        otherCategoryId = otherCategory.id;

        await prisma.transaction.createMany({
            data: [
                {
                    userId: ownerId,
                    cardId: ownerCardId,
                    providerTransactionId: `owner-1-${runId}`,
                    description: 'Owner groceries',
                    amountInCents: BigInt(12900),
                    occurredAt: new Date('2026-11-10T12:00:00.000Z'),
                },
                {
                    userId: ownerId,
                    cardId: ownerCardId,
                    providerTransactionId: `owner-2-${runId}`,
                    description: 'Owner transport',
                    amountInCents: BigInt(2550),
                    occurredAt: new Date('2026-11-12T12:00:00.000Z'),
                },
                {
                    userId: otherUserId,
                    cardId: otherCardId,
                    providerTransactionId: `other-1-${runId}`,
                    description: 'Other private purchase',
                    amountInCents: BigInt(89900),
                    occurredAt: new Date('2026-11-13T12:00:00.000Z'),
                },
            ],
        });
    });

    afterAll(async () => {
        if (ownerId && otherUserId) {
            await prisma.user.deleteMany({
                where: {
                    id: {
                        in: [ownerId, otherUserId],
                    },
                },
            });
        }
        await prisma.$disconnect();
    });

    it('returns only the signed-in user transactions, newest first', async () => {
        const transactions = await listUserTransactions(prisma, ownerId);

        expect(transactions.map((transaction) => transaction.description)).toEqual([
            'Owner transport',
            'Owner groceries',
        ]);
        expect(transactions.every((transaction) =>
            transaction.description !== 'Other private purchase',
        )).toBe(true);
    });

    it('rejects linking another user credit card to a transaction', async () => {
        await expect(prisma.transaction.create({
            data: {
                userId: ownerId,
                cardId: otherCardId,
                providerTransactionId: `invalid-card-${runId}`,
                description: 'Invalid ownership',
                amountInCents: BigInt(100),
                occurredAt: new Date(),
            },
        })).rejects.toThrow();
    });

    it('rejects linking another user category to a transaction', async () => {
        await expect(prisma.transaction.create({
            data: {
                userId: ownerId,
                cardId: ownerCardId,
                categoryId: otherCategoryId,
                providerTransactionId: `invalid-category-${runId}`,
                description: 'Invalid ownership',
                amountInCents: BigInt(100),
                occurredAt: new Date(),
            },
        })).rejects.toThrow();
    });

    it('rejects linking a credit card to another user bank connection', async () => {
        await expect(prisma.creditCard.create({
            data: {
                userId: ownerId,
                connectionId: otherConnectionId,
                externalAccountId: `invalid-connection-${runId}`,
                name: 'Invalid ownership',
            },
        })).rejects.toThrow();
    });
});
