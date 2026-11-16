import { beforeEach, describe, expect, it, vi } from 'vitest';
import { previewReconciledProviderBatch } from './reconciled-preview';

const findCard = vi.fn();
const findMany = vi.fn();
const database = {
    creditCard: { findFirst: findCard },
    transaction: { findMany },
} as unknown as Parameters<typeof previewReconciledProviderBatch>[0];

const batch = {
    cardExternalId: 'external-card',
    transactions: [{
        externalId: 'external-purchase',
        description: 'Coffee',
        amountInCents: '1200',
        occurredAt: '2026-11-15T12:00:00.000Z',
    }],
};

describe('reconciled provider preview', () => {
    beforeEach(() => {
        findCard.mockReset().mockResolvedValue({ id: 'card-a' });
        findMany.mockReset().mockResolvedValue([]);
    });

    it('maps the provider card to its owner and previews new transactions', async () => {
        const result = await previewReconciledProviderBatch(
            database, 'owner-a', 'connection-a', batch,
        );
        expect(findCard).toHaveBeenCalledWith({
            where: {
                userId: 'owner-a', connectionId: 'connection-a',
                externalAccountId: 'external-card',
            },
            select: { id: true },
        });
        expect(result.cardId).toBe('card-a');
        expect(result.toImport).toHaveLength(1);
        expect(result.toImport[0].amountInCents).toBe('1200');
        expect(result.duplicates).toEqual([]);
        expect(result.conflicts).toEqual([]);
        expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
            where: expect.objectContaining({ userId: 'owner-a', cardId: 'card-a' }),
        }));
    });

    it('returns JSON-safe persisted duplicates without writing', async () => {
        findMany.mockResolvedValue([{
            cardId: 'card-a', providerTransactionId: 'external-purchase',
            amountInCents: BigInt(1200), description: 'Coffee',
            occurredAt: new Date('2026-11-15T12:00:00.000Z'),
        }]);
        const result = await previewReconciledProviderBatch(
            database, 'owner-a', 'connection-a', batch,
        );
        expect(result.toImport).toEqual([]);
        expect(result.duplicates).toHaveLength(1);
        expect(result.duplicates[0].amountInCents).toBe('1200');
        expect(() => JSON.stringify(result)).not.toThrow();
    });

    it('serializes conflicts when persisted values differ', async () => {
        findMany.mockResolvedValue([{
            cardId: 'card-a', providerTransactionId: 'external-purchase',
            amountInCents: BigInt(2000), description: 'Coffee',
            occurredAt: new Date('2026-11-15T12:00:00.000Z'),
        }]);
        const result = await previewReconciledProviderBatch(
            database, 'owner-a', 'connection-a', batch,
        );
        expect(result.conflicts).toHaveLength(1);
        expect(result.conflicts[0].existing.amountInCents).toBe('2000');
        expect(() => JSON.stringify(result)).not.toThrow();
    });

    it('fails closed for unmapped cards before reading transactions', async () => {
        findCard.mockResolvedValue(null);
        await expect(previewReconciledProviderBatch(
            database, 'owner-a', 'connection-a', batch,
        )).rejects.toThrow('Provider card not found');
        expect(findMany).not.toHaveBeenCalled();
    });
});
