import { describe, expect, it } from 'vitest';
import { summarizeInvoiceAdjustments } from './adjustments';

describe('card invoice credit and refund breakdown', () => {
    it('separates positive charges and negative imported credits without double-counting', () => {
        expect(summarizeInvoiceAdjustments([
            { source: 'IMPORTED', amountInCents: BigInt(15000) },
            { source: 'MANUAL', amountInCents: BigInt(2500) },
            { source: 'IMPORTED', amountInCents: BigInt(-3000) },
        ])).toEqual({
            chargesInCents: BigInt(17500),
            creditsInCents: BigInt(3000),
            netInCents: BigInt(14500),
            creditCount: 1,
        });
    });

    it('handles a refund-only cycle and exact large integer amounts', () => {
        expect(summarizeInvoiceAdjustments([
            { source: 'IMPORTED', amountInCents: BigInt('-90071992547409930') },
        ])).toEqual({
            chargesInCents: BigInt(0),
            creditsInCents: BigInt('90071992547409930'),
            netInCents: BigInt('-90071992547409930'),
            creditCount: 1,
        });
    });

    it('does not misclassify negative manual records as imported refunds', () => {
        expect(() => summarizeInvoiceAdjustments([
            { source: 'MANUAL', amountInCents: BigInt(-1) },
        ])).toThrow();
    });

    it('returns zeros for empty invoices', () => {
        expect(summarizeInvoiceAdjustments([]).netInCents).toBe(BigInt(0));
    });
});
