import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { importCardTransactions } from './import';

if (!(process.env.DATABASE_URL ?? '').includes('ec_finance_test')) {
    throw new Error('Import integration requires dedicated ec_finance_test.');
}

const prisma = new PrismaClient();
const runId = randomUUID();
const input = [{
    providerTransactionId: 'purchase-1',
    description: 'Groceries',
    amountInCents: '2500',
    occurredAt: '2026-11-15T12:00:00.000Z',
}];

describe('PostgreSQL atomic transaction import', () => {
    let ownerId = '';
    let otherId = '';
    let cardId = '';
    let otherCardId = '';

    beforeAll(async () => {
        const owner = await prisma.user.create({
            data: { email: `import-owner-${runId}@example.test` },
        });
        const other = await prisma.user.create({
            data: { email: `import-other-${runId}@example.test` },
        });
        ownerId = owner.id;
        otherId = other.id;
        const ownerConnection = await prisma.bankConnection.create({
            data: { userId: ownerId, provider: 'test', externalItemId: `owner-${runId}` },
        });
        const otherConnection = await prisma.bankConnection.create({
            data: { userId: otherId, provider: 'test', externalItemId: `other-${runId}` },
        });
        const card = await prisma.creditCard.create({
            data: {
                userId: ownerId, connectionId: ownerConnection.id,
                externalAccountId: `owner-card-${runId}`, name: 'Owner card',
            },
        });
        const otherCard = await prisma.creditCard.create({
            data: {
                userId: otherId, connectionId: otherConnection.id,
                externalAccountId: `other-card-${runId}`, name: 'Other card',
            },
        });
        cardId = card.id;
        otherCardId = otherCard.id;
    });

    afterAll(async () => {
        if (ownerId && otherId) {
            await prisma.user.deleteMany({ where: { id: { in: [ownerId, otherId] } } });
        }
        await prisma.$disconnect();
    });

    it('persists imported transactions and skips repeated imports', async () => {
        const first = await importCardTransactions(prisma, ownerId, cardId, input);
        expect(first).toEqual({ importedCount: 1, duplicateCount: 0 });
        const repeated = await importCardTransactions(prisma, ownerId, cardId, input);
        expect(repeated).toEqual({ importedCount: 0, duplicateCount: 1 });
        const saved = await prisma.transaction.findMany({
            where: { userId: ownerId, cardId, providerTransactionId: 'purchase-1' },
        });
        expect(saved).toHaveLength(1);
        expect(saved[0].amountInCents).toBe(BigInt(2500));
    });

    it('rolls back the entire batch on an existing amount conflict', async () => {
        await expect(importCardTransactions(prisma, ownerId, cardId, [
            { ...input[0], amountInCents: '9999' },
            { ...input[0], providerTransactionId: 'new-after-conflict' },
        ])).rejects.toThrow('Conflicting imported transactions');
        expect(await prisma.transaction.count({
            where: { userId: ownerId, cardId, providerTransactionId: 'new-after-conflict' },
        })).toBe(0);
    });

    it('blocks another user card and keeps tenant records separate', async () => {
        await expect(importCardTransactions(prisma, otherId, cardId, input))
            .rejects.toThrow('Credit card not found');
        const result = await importCardTransactions(prisma, otherId, otherCardId, input);
        expect(result).toEqual({ importedCount: 1, duplicateCount: 0 });
        expect(await prisma.transaction.count({
            where: { userId: otherId, cardId: otherCardId, providerTransactionId: 'purchase-1' },
        })).toBe(1);
    });

    it('rejects invalid amounts without database writes', async () => {
        await expect(importCardTransactions(prisma, ownerId, cardId, [{
            ...input[0], amountInCents: '0',
        }])).rejects.toThrow();
        expect(await prisma.transaction.count({ where: { userId: ownerId, cardId } })).toBe(1);
    });
});
