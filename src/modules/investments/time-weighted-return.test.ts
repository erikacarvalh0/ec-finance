import { describe, expect, it } from 'vitest';
import { calculateTimeWeightedReturn } from './time-weighted-return';

describe('time-weighted investment return', () => {
    it('calculates the return when no external cash flows exist', () => {
        expect(calculateTimeWeightedReturn([
            { recordedAt: new Date('2026-01-01'), amountInCents: BigInt(10000) },
            { recordedAt: new Date('2026-02-01'), amountInCents: BigInt(11000) },
        ], [])).toEqual({ percentage: 10, method: 'TWR' });
    });
    it('chains subperiod returns using a valuation immediately before a deposit', () => {
        expect(calculateTimeWeightedReturn([
            { recordedAt: new Date('2026-01-01'), amountInCents: BigInt(10000) },
            { recordedAt: new Date('2026-02-01'), amountInCents: BigInt(11000) },
            { recordedAt: new Date('2026-03-01'), amountInCents: BigInt(13200) },
        ], [{
            occurredAt: new Date('2026-02-01'), type: 'DEPOSIT', amountInCents: BigInt(1000),
        }])).toEqual({ percentage: 21, method: 'TWR' });
    });
    it('declines to fabricate TWR without an external cash flow boundary valuation', () => {
        expect(calculateTimeWeightedReturn([
            { recordedAt: new Date('2026-01-01'), amountInCents: BigInt(10000) },
            { recordedAt: new Date('2026-03-01'), amountInCents: BigInt(13000) },
        ], [{
            occurredAt: new Date('2026-02-01'), type: 'DEPOSIT', amountInCents: BigInt(1000),
        }])).toEqual({ percentage: null, method: 'MISSING_CASHFLOW_BOUNDARY_VALUATION' });
    });
});
