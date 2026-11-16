import { beforeEach, describe, expect, it, vi } from 'vitest';
import { previewOwnedProviderCardBatch } from './owned-card-preview';

const findFirst = vi.fn();
const database = {
    creditCard: { findFirst },
} as unknown as Parameters<typeof previewOwnedProviderCardBatch>[0];

const batch = {
    cardExternalId: 'provider-card',
    transactions: [{
        externalId: 'provider-purchase',
        description: 'Coffee',
        amountInCents: '1200',
        occurredAt: '2026-11-15T12:00:00.000Z',
    }],
};

describe('owner-scoped provider card preview', () => {
    beforeEach(() => {
        findFirst.mockReset().mockResolvedValue({ id: 'owned-card' });
    });

    it('resolves provider cards using the owner and bank connection', async () => {
        const result = await previewOwnedProviderCardBatch(
            database, 'owner-a', 'connection-a', batch,
        );
        expect(findFirst).toHaveBeenCalledWith({
            where: {
                userId: 'owner-a', connectionId: 'connection-a',
                externalAccountId: 'provider-card',
            },
            select: { id: true },
        });
        expect(result.cardId).toBe('owned-card');
        expect(result.transactions).toEqual([{
            providerTransactionId: 'provider-purchase',
            description: 'Coffee', amountInCents: '1200',
            occurredAt: '2026-11-15T12:00:00.000Z',
        }]);
    });

    it('rejects unowned or unmapped provider cards', async () => {
        findFirst.mockResolvedValue(null);
        await expect(previewOwnedProviderCardBatch(
            database, 'owner-a', 'connection-a', batch,
        )).rejects.toThrow('Provider card not found');
    });

    it('rejects missing owner and connection before database access', async () => {
        await expect(previewOwnedProviderCardBatch(
            database, '', 'connection-a', batch,
        )).rejects.toThrow();
        await expect(previewOwnedProviderCardBatch(
            database, 'owner-a', '', batch,
        )).rejects.toThrow();
        expect(findFirst).not.toHaveBeenCalled();
    });

    it('rejects invalid provider batches before database access', async () => {
        await expect(previewOwnedProviderCardBatch(
            database, 'owner-a', 'connection-a',
            { ...batch, transactions: [{ ...batch.transactions[0], amountInCents: '-1' }] },
        )).rejects.toThrow();
        expect(findFirst).not.toHaveBeenCalled();
    });
});
