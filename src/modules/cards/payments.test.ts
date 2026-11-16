import { describe, expect, it } from 'vitest';
import { summarizeInvoicePayments } from './payments';

const invoice = {
    period: '2026-11',
    dueDate: new Date('2026-11-20T00:00:00.000Z'),
    totalInCents: BigInt(12000),
};

describe('invoice payment reconciliation', () => {
    it('shows an open invoice with full balance before closing', () => {
        const summary = summarizeInvoicePayments(invoice, [], new Date('2026-11-09T12:00:00.000Z'), new Date('2026-11-10T00:00:00.000Z'));

        expect(summary.status).toBe('OPEN');
        expect(summary.paidInCents).toBe(BigInt(0));
        expect(summary.balanceInCents).toBe(BigInt(12000));
    });

    it('shows an unpaid invoice as closed after its closing date', () => {
        const summary = summarizeInvoicePayments(invoice, [], new Date('2026-11-11T00:00:00.000Z'), new Date('2026-11-10T00:00:00.000Z'));

        expect(summary.status).toBe('CLOSED');
    });

    it('tracks partial payments and remaining debt in integer cents', () => {
        const summary = summarizeInvoicePayments(invoice, [
            { amountInCents: BigInt(3500) },
            { amountInCents: BigInt(2000) },
        ], new Date('2026-11-15T00:00:00.000Z'), new Date('2026-11-10T00:00:00.000Z'));

        expect(summary.status).toBe('PARTIALLY_PAID');
        expect(summary.paidInCents).toBe(BigInt(5500));
        expect(summary.balanceInCents).toBe(BigInt(6500));
    });

    it('marks the invoice paid only after the complete amount is covered', () => {
        const summary = summarizeInvoicePayments(invoice, [
            { amountInCents: BigInt(5000) },
            { amountInCents: BigInt(7000) },
        ], new Date('2026-11-18T00:00:00.000Z'), new Date('2026-11-10T00:00:00.000Z'));

        expect(summary.status).toBe('PAID');
        expect(summary.balanceInCents).toBe(BigInt(0));
    });

    it('does not mark an invoice with no charges as paid', () => {
        const summary = summarizeInvoicePayments({ ...invoice, totalInCents: BigInt(0) }, [], new Date('2026-11-09T00:00:00.000Z'), new Date('2026-11-10T00:00:00.000Z'));

        expect(summary.status).toBe('OPEN');
    });

    it('rejects an overpaid invoice instead of hiding a negative balance', () => {
        expect(() => summarizeInvoicePayments(invoice, [
            { amountInCents: BigInt(12001) },
        ], new Date('2026-11-18T00:00:00.000Z'), new Date('2026-11-10T00:00:00.000Z'))).toThrow('Payments exceed invoice total');
    });
});
