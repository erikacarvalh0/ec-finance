import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { importCardTransactions } from './import';

if (!(process.env.DATABASE_URL ?? '').includes('ec_finance_test')) {
    throw new Error('Concurrency tests require dedicated ec_finance_test.');
}

const prisma = new PrismaClient();
const runId = randomUUID();
const batch = [{
    providerTransactionId: 'concurrent-purchase',
    description: 'Groceries',
    amountInCents: '3200',
    occurredAt: '2026-11-15T12:00:00.000Z',
}];

describe('concurrent card import idempotency in PostgreSQL', () => {
    let ownerId = '';
    let cardId = '';

    beforeAll(async () => {
        const owner = await prisma.user.create({
            data: { email: `concurrent-import-${runId}@example.test` },
        });
        ownerId = owner.id;
        const connection = await prisma.bankConnection.create({
            data: { userId: ownerId, provider: 'test', externalItemId: runId },
        });
        const card = await prisma.creditCard.create({
            data: {
                userId: ownerId, connectionId: connection.id,
                externalAccountId: `concurrent-card-${runId}`, name: 'Concurrency card',
            },
        });
        cardId = card.id;
    });

    afterAll(async () => {
        if (ownerId) {
            await prisma.user.delete({ where: { id: ownerId } });
        }
        await prisma.$disconnect();
    });

    it('never inserts two records with the same provider ID under simultaneous requests', async () => {
        const results = await Promise.all([
            importCardTransactions(prisma, ownerId, cardId, batch),
            importCardTransactions(prisma, ownerId, cardId, batch),
        ]);

        expect(results.reduce((sum, result) => sum + result.importedCount, 0)).toBe(1);
        expect(results.reduce((sum, result) => sum + result.duplicateCount, 0)).toBe(1);
        const persisted = await prisma.transaction.findMany({
            where: {
                userId: ownerId, cardId,
                providerTransactionId: 'concurrent-purchase',
            },
        });
        expect(persisted).toHaveLength(1);
        expect(persisted[0].amountInCents).toBe(BigInt(3200));
    });

    it('replays the same batch safely after concurrent imports', async () => {
        const result = await importCardTransactions(prisma, ownerId, cardId, batch);
        expect(result).toEqual({ importedCount: 0, duplicateCount: 1 });
    });
});
