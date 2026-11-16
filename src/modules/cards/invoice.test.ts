import { describe, expect, it } from 'vitest';
import {
    getInvoicePeriod,
    getInvoiceDueDate,
    buildCardInvoice,
} from './invoice';

const card = {
    id: 'card-a',
    closingDay: 10,
    dueDay: 20,
};

describe('credit-card invoice calendar', () => {
    it('places purchases after closing in the next billing cycle', () => {
        const before = getInvoicePeriod(new Date('2026-11-10T00:00:00.000Z'), 10);
        const after = getInvoicePeriod(new Date('2026-11-11T00:00:00.000Z'), 10);

        expect(before).toBe('2026-11');
        expect(after).toBe('2026-12');
    });

    it('clamps closing days for February and other shorter months', () => {
        expect(getInvoicePeriod(new Date('2027-02-28T00:00:00.000Z'), 31))
            .toBe('2027-02');
        expect(getInvoicePeriod(new Date('2028-02-29T00:00:00.000Z'), 31))
            .toBe('2028-02');
    });

    it('calculates a due date after the invoice closes', () => {
        expect(getInvoiceDueDate('2026-11', 10, 20).toISOString())
            .toBe('2026-11-20T00:00:00.000Z');
        expect(getInvoiceDueDate('2026-11', 28, 5).toISOString())
            .toBe('2026-12-05T00:00:00.000Z');
    });

    it('groups imported purchases and manual installments without adding whole purchases repeatedly', () => {
        const invoice = buildCardInvoice(card, '2026-12', [{
            id: 'transaction-a',
            description: 'Spotify',
            amountInCents: BigInt(2990),
            occurredAt: new Date('2026-11-11T12:00:00.000Z'),
        }], [{
            id: 'expense-a',
            description: 'Laptop',
            amountInCents: BigInt(10001),
            installments: 3,
            date: new Date('2026-11-10T00:00:00.000Z'),
            createdAt: new Date('2026-11-10T00:00:00.000Z'),
            linkedTransactionId: null,
        }]);

        expect(invoice.lines.map((line) => line.amountInCents))
            .toEqual([BigInt(2990), BigInt(3334)]);
        expect(invoice.totalInCents).toBe(BigInt(6324));
        expect(invoice.lines[1].installmentLabel).toBe('2/3');
    });

    it('does not double count a manual purchase explicitly linked to an imported transaction', () => {
        const invoice = buildCardInvoice(card, '2026-11', [{
            id: 'import-a',
            description: 'Laptop',
            amountInCents: BigInt(5000),
            occurredAt: new Date('2026-11-05T00:00:00.000Z'),
        }], [{
            id: 'expense-a',
            description: 'Laptop',
            amountInCents: BigInt(5000),
            installments: 1,
            date: new Date('2026-11-05T00:00:00.000Z'),
            createdAt: new Date('2026-11-05T00:00:00.000Z'),
            linkedTransactionId: 'import-a',
        }]);

        expect(invoice.lines).toHaveLength(1);
        expect(invoice.totalInCents).toBe(BigInt(5000));
    });

    it('rejects unconfigured cards and invalid billing periods', () => {
        expect(() => buildCardInvoice({ ...card, closingDay: null }, '2026-11', [], []))
            .toThrow('Card billing cycle is not configured');
        expect(() => buildCardInvoice(card, '2026-13', [], []))
            .toThrow();
    });
});
