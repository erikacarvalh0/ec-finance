import { describe, expect, it } from 'vitest';
import { normalizeCardImportBatch } from './adapter';

describe('provider-neutral card import contract', () => {
    const sample = {
        cardExternalId: 'card-123',
        transactions: [{
            externalId: 'purchase-a',
            description: ' Market ',
            amountInCents: '1999',
            occurredAt: '2026-11-12T14:30:00.000Z',
        }],
    };

    it('validates and normalizes provider records without changing exact money', () => {
        const result = normalizeCardImportBatch(sample);
        expect(result).toEqual({
            cardExternalId: 'card-123',
            transactions: [{
                externalId: 'purchase-a',
                description: 'Market',
                amountInCents: BigInt(1999),
                occurredAt: new Date('2026-11-12T14:30:00.000Z'),
            }],
            duplicateExternalIds: [],
        });
    });

    it('deduplicates repeated external IDs without collapsing distinct purchases with identical amounts', () => {
        const result = normalizeCardImportBatch({
            ...sample,
            transactions: [
                sample.transactions[0],
                { ...sample.transactions[0], externalId: 'purchase-b' },
                sample.transactions[0],
            ],
        });
        expect(result.transactions.map(item => item.externalId)).toEqual(['purchase-a', 'purchase-b']);
        expect(result.duplicateExternalIds).toEqual(['purchase-a']);
    });

    it('fails closed on conflicting data for the same external ID', () => {
        expect(() => normalizeCardImportBatch({
            ...sample,
            transactions: [
                sample.transactions[0],
                { ...sample.transactions[0], amountInCents: '9999' },
            ],
        })).toThrow('Conflicting provider transaction ID');
    });

    it.each(['0', '-100', '1.1', '999999999999999999999999'])(
        'rejects invalid purchase cents %s',
        amountInCents => {
            expect(() => normalizeCardImportBatch({
                ...sample,
                transactions: [{ ...sample.transactions[0], amountInCents }],
            })).toThrow();
        },
    );

    it('accepts the signed 64-bit maximum and rejects the first overflowing cent', () => {
        const max = normalizeCardImportBatch({
            ...sample,
            transactions: [{
                ...sample.transactions[0],
                amountInCents: '9223372036854775807',
            }],
        });
        expect(max.transactions[0].amountInCents).toBe(BigInt('9223372036854775807'));
        expect(() => normalizeCardImportBatch({
            ...sample,
            transactions: [{
                ...sample.transactions[0],
                amountInCents: '9223372036854775808',
            }],
        })).toThrow('Provider transaction amount is out of range');
    });

    it('deduplicates equal instants across timezone offsets', () => {
        const result = normalizeCardImportBatch({
            ...sample,
            transactions: [
                sample.transactions[0],
                { ...sample.transactions[0], occurredAt: '2026-11-12T11:30:00-03:00' },
            ],
        });
        expect(result.transactions).toHaveLength(1);
        expect(result.duplicateExternalIds).toEqual(['purchase-a']);
    });

    it('rejects unknown fields and oversized provider identifiers', () => {
        expect(() => normalizeCardImportBatch({
            ...sample,
            unexpectedField: 'not allowed',
        } as typeof sample)).toThrow();
        expect(() => normalizeCardImportBatch({
            ...sample,
            cardExternalId: 'x'.repeat(201),
        })).toThrow();
        expect(() => normalizeCardImportBatch({
            ...sample,
            transactions: [{ ...sample.transactions[0], description: 'x'.repeat(256) }],
        })).toThrow();
    });

    it('rejects empty IDs, invalid timestamps, and excessive batches', () => {
        expect(() => normalizeCardImportBatch({
            ...sample,
            transactions: [{ ...sample.transactions[0], externalId: '' }],
        })).toThrow();
        expect(() => normalizeCardImportBatch({
            ...sample,
            transactions: [{ ...sample.transactions[0], occurredAt: '2026-11-12' }],
        })).toThrow();
        expect(() => normalizeCardImportBatch({
            ...sample,
            transactions: Array.from({ length: 501 }, () => sample.transactions[0]),
        })).toThrow();
    });
});
