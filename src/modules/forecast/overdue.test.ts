import { describe, expect, it } from 'vitest';
import { isOccurrenceOverdue, getOverdueExpenseTotals } from './overdue';

describe('overdue expenses', () => {
    const today = new Date('2026-11-16T12:00:00.000Z');

    it('identifies pending installments past their calendar due date', () => {
        expect(isOccurrenceOverdue('PENDING', new Date('2026-11-15T00:00:00.000Z'), today)).toBe(true);
        expect(isOccurrenceOverdue('PENDING', new Date('2026-11-16T00:00:00.000Z'), today)).toBe(false);
    });

    it('never flags settled or canceled occurrences as overdue', () => {
        expect(isOccurrenceOverdue('SETTLED', new Date('2026-11-01T00:00:00.000Z'), today)).toBe(false);
        expect(isOccurrenceOverdue('CANCELED', new Date('2026-11-01T00:00:00.000Z'), today)).toBe(false);
    });

    it('totals only past-due, still-pending expenses', () => {
        const result = getOverdueExpenseTotals([
            { status: 'PENDING', dueDate: new Date('2026-11-10T00:00:00.000Z'), effectiveAmountInCents: BigInt(1000) },
            { status: 'SETTLED', dueDate: new Date('2026-11-09T00:00:00.000Z'), effectiveAmountInCents: BigInt(2000) },
            { status: 'PENDING', dueDate: new Date('2026-11-20T00:00:00.000Z'), effectiveAmountInCents: BigInt(3000) },
        ], today);

        expect(result).toEqual({ count: 1, totalInCents: BigInt(1000) });
    });
});
