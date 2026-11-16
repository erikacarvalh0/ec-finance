import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { previewCardTransactionImport } from './import-preview';

if (!(process.env.DATABASE_URL ?? '').includes('ec_finance_test')) {
    throw new Error('Import preview integration requires ec_finance_test.');
}

const prisma = new PrismaClient();
const unique = randomUUID();
const input = [{
    providerTransactionId: 'external-purchase-1',
    description: 'Groceries',
    amountInCents: '1500',
    occurredAt: '2026-11-15T12:00:00.000Z',
}];

describe('PostgreSQL card import preview ownership and reconciliation', () => {
    let ownerId = '';
    let otherId = '';
    let ownerCardId = '';
    let otherCardId = '';

    beforeAll(async () => {
        const owner = await prisma.user.create({
            data: { email: `import-preview-owner-${unique}@example.test` },
        });
        const other = await prisma.user.create({
            data: { email: `import-preview-other-${unique}@example.test` },
        });
        ownerId = owner.id;
        otherId = other.id;
        const connection = await prisma.bankConnection.create({
            data: { userId: ownerId, provider: 'test', externalItemId: `owner-${unique}` },
        });
        const otherConnection = await prisma.bankConnection.create({
            data: { userId: otherId, provider: 'test', externalItemId: `other-${unique}` },
        });
        const card = await prisma.creditCard.create({
            data: {
                userId: ownerId, connectionId: connection.id,
                externalAccountId: 'card-primary', name: 'Primary card',
            },
        });
        const otherCard = await prisma.creditCard.create({
            data: {
                userId: otherId, connectionId: otherConnection.id,
                externalAccountId: 'card-other', name: 'Other card',
            },
        });
        ownerCardId = card.id;
        otherCardId = otherCard.id;
        await prisma.transaction.create({
            data: {
                userId: ownerId, cardId: ownerCardId,
                providerTransactionId: 'external-purchase-1',
                description: 'Groceries', amountInCents: BigInt(1500),
                occurredAt: new Date('2026-11-15T12:00:00.000Z'),
            },
        });
    });

    afterAll(async () => {
        if (ownerId && otherId) {
            await prisma.user.deleteMany({
                where: { id: { in: [ownerId, otherId] } },
            });
        }
        await prisma.$disconnect();
    });

    it('reports persisted duplicates without changing the database', async () => {
        const before = await prisma.transaction.count({ where: { userId: ownerId } });
        const result = await previewCardTransactionImport(prisma, ownerId, ownerCardId, input);
        expect(result.duplicates).toHaveLength(1);
        expect(result.toImport).toHaveLength(0);
        expect(await prisma.transaction.count({ where: { userId: ownerId } })).toBe(before);
    });

    it('detects amount conflicts from existing records', async () => {
        const result = await previewCardTransactionImport(prisma, ownerId, ownerCardId, [{
            ...input[0], amountInCents: '2000',
        }]);
        expect(result.conflicts).toHaveLength(1);
        expect(result.toImport).toHaveLength(0);
    });

    it('does not expose another user card or transactions', async () => {
        await expect(previewCardTransactionImport(prisma, otherId, ownerCardId, input))
            .rejects.toThrow('Credit card not found');
        const result = await previewCardTransactionImport(prisma, otherId, otherCardId, input);
        expect(result.toImport).toHaveLength(1);
        expect(result.duplicates).toHaveLength(0);
    });

    it('rejects malformed requests before any database writes', async () => {
        await expect(previewCardTransactionImport(prisma, ownerId, ownerCardId, [{
            ...input[0], amountInCents: '-1',
        }])).rejects.toThrow();
        expect(await prisma.transaction.count({ where: { userId: ownerId } })).toBe(1);
    });
});
