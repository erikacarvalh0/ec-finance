import { describe, expect, it } from 'vitest';
import { mapProviderBatchToImportPreview } from './preview-mapping';

const sample = {
    cardExternalId: 'external-card',
    transactions: [{
        externalId: 'purchase-1',
        description: 'Coffee',
        amountInCents: '1200',
        occurredAt: '2026-11-12T14:30:00.000Z',
    }],
};

describe('provider batch to owned card preview mapping', () => {
    it('maps provider IDs to card-scoped import candidates without losing cents', () => {
        expect(mapProviderBatchToImportPreview(sample, 'owned-card')).toEqual({
            cardId: 'owned-card',
            transactions: [{
                providerTransactionId: 'purchase-1',
                description: 'Coffee',
                amountInCents: '1200',
                occurredAt: '2026-11-12T14:30:00.000Z',
            }],
            duplicateExternalIds: [],
        });
    });

    it('preserves distinct external IDs and reports repeated identical IDs', () => {
        const result = mapProviderBatchToImportPreview({
            ...sample,
            transactions: [
                sample.transactions[0],
                sample.transactions[0],
                { ...sample.transactions[0], externalId: 'purchase-2' },
            ],
        }, 'owned-card');
        expect(result.transactions.map((item) => item.providerTransactionId))
            .toEqual(['purchase-1', 'purchase-2']);
        expect(result.duplicateExternalIds).toEqual(['purchase-1']);
    });

    it('rejects missing card mapping and conflicting provider records', () => {
        expect(() => mapProviderBatchToImportPreview(sample, '')).toThrow();
        expect(() => mapProviderBatchToImportPreview({
            ...sample,
            transactions: [
                sample.transactions[0],
                { ...sample.transactions[0], amountInCents: '1400' },
            ],
        }, 'owned-card')).toThrow('Conflicting provider transaction ID');
    });

    it('preserves timezone instants as normalized ISO timestamps', () => {
        const result = mapProviderBatchToImportPreview({
            ...sample,
            transactions: [{
                ...sample.transactions[0],
                occurredAt: '2026-11-12T11:30:00-03:00',
            }],
        }, 'owned-card');
        expect(result.transactions[0].occurredAt).toBe('2026-11-12T14:30:00.000Z');
    });
});
