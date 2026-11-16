import { beforeEach, describe, expect, it, vi } from 'vitest';
import { previewCardTransactionImport } from './import-preview';

const findCard = vi.fn();
const findMany = vi.fn();
const database = {
    creditCard: { findFirst: findCard },
    transaction: { findMany },
} as unknown as Parameters<typeof previewCardTransactionImport>[0];

const input = [{
    providerTransactionId: 'provider-1',
    description: 'Groceries',
    amountInCents: '2500',
    occurredAt: '2026-11-15T12:00:00.000Z',
}];

describe('owner-scoped imported transaction preview', () => {
    beforeEach(() => {
        findCard.mockReset().mockResolvedValue({ id: 'card-1' });
        findMany.mockReset().mockResolvedValue([]);
    });

    it('checks ownership before querying existing provider IDs', async () => {
        const result = await previewCardTransactionImport(database, 'owner-1', 'card-1', input);
        expect(findCard).toHaveBeenCalledWith({
            where: { id: 'card-1', userId: 'owner-1' }, select: { id: true },
        });
        expect(findMany).toHaveBeenCalledWith({
            where: { userId: 'owner-1', cardId: 'card-1', providerTransactionId: { in: ['provider-1'] } },
            select: { providerTransactionId: true, cardId: true, amountInCents: true },
        });
        expect(result.toImport).toHaveLength(1);
        expect(result.toImport[0].amountInCents).toBe(BigInt(2500));
    });

    it('does not query transactions if card is not owned', async () => {
        findCard.mockResolvedValue(null);
        await expect(previewCardTransactionImport(database, 'owner-1', 'card-1', input))
            .rejects.toThrow('Credit card not found');
        expect(findMany).not.toHaveBeenCalled();
    });

    it('reports conflicts from owner-scoped persisted records', async () => {
        findMany.mockResolvedValue([{
            providerTransactionId: 'provider-1', cardId: 'card-1', amountInCents: BigInt(3000),
        }]);
        const result = await previewCardTransactionImport(database, 'owner-1', 'card-1', input);
        expect(result.conflicts).toHaveLength(1);
        expect(result.toImport).toHaveLength(0);
    });

    it('rejects malformed input before accessing the database', async () => {
        await expect(previewCardTransactionImport(database, 'owner-1', 'card-1', [{
            ...input[0], amountInCents: '-100',
        }])).rejects.toThrow();
        expect(findCard).not.toHaveBeenCalled();
    });

    it('rejects oversized batches and anonymous access', async () => {
        await expect(previewCardTransactionImport(database, 'owner-1', 'card-1',
            Array.from({ length: 501 }, () => input[0]))).rejects.toThrow();
        await expect(previewCardTransactionImport(database, '', 'card-1', input)).rejects.toThrow();
        expect(findCard).not.toHaveBeenCalled();
    });
});
