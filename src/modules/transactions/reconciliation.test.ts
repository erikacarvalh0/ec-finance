import { describe, expect, it } from 'vitest';
import { reconcileImportedTransactions } from './reconciliation';

const date = (value: string) => new Date(value + 'T00:00:00.000Z');

describe('import reconciliation preview', () => {
    it('matches existing provider IDs only within the same card', () => {
        const result = reconcileImportedTransactions([
            { providerTransactionId: 'p-1', cardId: 'card-a', amountInCents: BigInt(100), occurredAt: date('2026-11-01'), description: 'Coffee' },
            { providerTransactionId: 'p-1', cardId: 'card-b', amountInCents: BigInt(200), occurredAt: date('2026-11-01'), description: 'Lunch' },
        ], [
            { providerTransactionId: 'p-1', cardId: 'card-a' },
        ]);
        expect(result.duplicates).toHaveLength(1);
        expect(result.toImport).toHaveLength(1);
        expect(result.toImport[0].cardId).toBe('card-b');
    });

    it('deduplicates repeated items in the same import batch', () => {
        const candidate = {
            providerTransactionId: 'p-1', cardId: 'card-a',
            amountInCents: BigInt(100), occurredAt: date('2026-11-01'), description: 'Coffee',
        };
        const result = reconcileImportedTransactions([candidate, candidate], []);
        expect(result.toImport).toHaveLength(1);
        expect(result.duplicates).toHaveLength(1);
    });

    it('flags conflicting amounts instead of silently discarding them', () => {
        const result = reconcileImportedTransactions([{
            providerTransactionId: 'p-1', cardId: 'card-a',
            amountInCents: BigInt(300), occurredAt: date('2026-11-01'), description: 'Coffee',
        }], [{
            providerTransactionId: 'p-1', cardId: 'card-a', amountInCents: BigInt(100),
        }]);
        expect(result.conflicts).toHaveLength(1);
        expect(result.toImport).toHaveLength(0);
        expect(result.duplicates).toHaveLength(0);
    });

    it('flags same-ID batch conflicts when descriptions or timestamps differ', () => {
        const original = {
            providerTransactionId: 'p-1', cardId: 'card-a',
            amountInCents: BigInt(100), occurredAt: date('2026-11-01'),
            description: 'Coffee',
        };
        const result = reconcileImportedTransactions([
            original,
            { ...original, description: 'Different merchant' },
            { ...original, occurredAt: date('2026-11-02') },
        ], []);
        expect(result.toImport).toHaveLength(1);
        expect(result.conflicts).toHaveLength(2);
        expect(result.duplicates).toHaveLength(0);
    });

    it('treats equal timestamps from distinct Date instances as identical', () => {
        const original = {
            providerTransactionId: 'p-1', cardId: 'card-a',
            amountInCents: BigInt(100), occurredAt: date('2026-11-01'),
            description: 'Coffee',
        };
        const result = reconcileImportedTransactions([
            original, { ...original, occurredAt: date('2026-11-01') },
        ], []);
        expect(result.toImport).toHaveLength(1);
        expect(result.duplicates).toHaveLength(1);
        expect(result.conflicts).toHaveLength(0);
    });

    it('detects persisted description and timestamp mismatches even when cents match', () => {
        const candidate = {
            providerTransactionId: 'p-1', cardId: 'card-a',
            amountInCents: BigInt(100), occurredAt: date('2026-11-01'),
            description: 'Coffee',
        };
        const result = reconcileImportedTransactions([candidate], [{
            providerTransactionId: 'p-1', cardId: 'card-a',
            amountInCents: BigInt(100), occurredAt: date('2026-11-02'),
            description: 'Changed merchant',
        }]);
        expect(result.conflicts).toHaveLength(1);
        expect(result.duplicates).toHaveLength(0);
    });

    it('never guesses duplicates from similar merchant and amount', () => {
        const result = reconcileImportedTransactions([{
            providerTransactionId: 'new-id', cardId: 'card-a',
            amountInCents: BigInt(100), occurredAt: date('2026-11-01'), description: 'Coffee',
        }], [{
            providerTransactionId: 'old-id', cardId: 'card-a', amountInCents: BigInt(100),
        }]);
        expect(result.toImport).toHaveLength(1);
    });

    it('rejects empty identifiers and invalid monetary values', () => {
        expect(() => reconcileImportedTransactions([{
            providerTransactionId: '', cardId: 'card-a',
            amountInCents: BigInt(100), occurredAt: date('2026-11-01'), description: 'Coffee',
        }], [])).toThrow();
        expect(() => reconcileImportedTransactions([{
            providerTransactionId: 'p-1', cardId: 'card-a',
            amountInCents: BigInt(-1), occurredAt: date('2026-11-01'), description: 'Coffee',
        }], [])).toThrow();
    });
});
