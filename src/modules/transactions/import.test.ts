import { describe, expect, it, vi } from 'vitest';
import { importCardTransactions } from './import';

const input = [{
    providerTransactionId: 'p-1',
    description: 'Groceries',
    amountInCents: '2500',
    occurredAt: '2026-11-15T12:00:00.000Z',
}];

function database(existing: { providerTransactionId: string; cardId: string; amountInCents: bigint }[] = []) {
    const findCard = vi.fn().mockResolvedValue({ id: 'card-1' });
    const findMany = vi.fn().mockResolvedValue(existing);
    const createMany = vi.fn().mockResolvedValue({ count: 1 });
    const transaction = vi.fn(async (callback) => callback({
        creditCard: { findFirst: findCard },
        transaction: { findMany, createMany },
    }));
    return {
        db: { $transaction: transaction } as unknown as Parameters<typeof importCardTransactions>[0],
        findCard, findMany, createMany, transaction,
    };
}

describe('atomic card import', () => {
    it('writes only owner-scoped new transactions in one transaction', async () => {
        const mock = database();
        const result = await importCardTransactions(mock.db, 'owner-1', 'card-1', input);
        expect(result).toEqual({ importedCount: 1, duplicateCount: 0 });
        expect(mock.transaction).toHaveBeenCalledOnce();
        expect(mock.createMany).toHaveBeenCalledWith({
            data: [{
                userId: 'owner-1', cardId: 'card-1', providerTransactionId: 'p-1',
                description: 'Groceries', amountInCents: BigInt(2500),
                occurredAt: new Date('2026-11-15T12:00:00.000Z'),
            }],
            skipDuplicates: true,
        });
    });

    it('skips exact duplicate provider IDs without writing', async () => {
        const mock = database([{ providerTransactionId: 'p-1', cardId: 'card-1', amountInCents: BigInt(2500) }]);
        const result = await importCardTransactions(mock.db, 'owner-1', 'card-1', input);
        expect(result).toEqual({ importedCount: 0, duplicateCount: 1 });
        expect(mock.createMany).not.toHaveBeenCalled();
    });

    it('aborts the transaction on a conflicting amount', async () => {
        const mock = database([{ providerTransactionId: 'p-1', cardId: 'card-1', amountInCents: BigInt(9999) }]);
        await expect(importCardTransactions(mock.db, 'owner-1', 'card-1', input))
            .rejects.toThrow('Conflicting imported transactions');
        expect(mock.createMany).not.toHaveBeenCalled();
    });

    it('rejects another user card before querying transactions', async () => {
        const mock = database();
        mock.findCard.mockResolvedValue(null);
        await expect(importCardTransactions(mock.db, 'owner-1', 'card-1', input))
            .rejects.toThrow('Credit card not found');
        expect(mock.findMany).not.toHaveBeenCalled();
    });

    it('rejects invalid input before starting a transaction', async () => {
        const mock = database();
        await expect(importCardTransactions(mock.db, 'owner-1', 'card-1', [{
            ...input[0], amountInCents: '0',
        }])).rejects.toThrow();
        expect(mock.transaction).not.toHaveBeenCalled();
    });
});
