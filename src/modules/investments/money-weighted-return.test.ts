import { describe, expect, it } from 'vitest';
import { calculateMoneyWeightedReturn } from './money-weighted-return';

const start = new Date('2025-01-01T00:00:00Z');
const end = new Date('2026-01-01T00:00:00Z');

describe('money-weighted investment return (annualized XIRR)', () => {
    it('returns approximately 10% for a one-year investment without contributions', () => {
        const result = calculateMoneyWeightedReturn([
            { recordedAt: start, amountInCents: BigInt(10000) },
            { recordedAt: end, amountInCents: BigInt(11000) },
        ], []);
        expect(result.method).toBe('MWR_XIRR');
        expect(result.percentage).toBeCloseTo(10, 1);
    });
    it('accounts for dated contributions as negative investor cashflows', () => {
        const result = calculateMoneyWeightedReturn([
            { recordedAt: start, amountInCents: BigInt(10000) },
            { recordedAt: end, amountInCents: BigInt(22000) },
        ], [{
            occurredAt: new Date('2025-07-01T00:00:00Z'),
            type: 'DEPOSIT',
            amountInCents: BigInt(10000),
        }]);
        expect(result.method).toBe('MWR_XIRR');
        expect(result.percentage).not.toBeNull();
        expect(result.percentage!).toBeGreaterThan(10);
        expect(result.percentage!).toBeLessThan(20);
    });
    it('returns unavailable for missing valuations and impossible sign patterns', () => {
        expect(calculateMoneyWeightedReturn([], [])).toEqual({
            percentage: null, method: 'UNAVAILABLE_VALUATIONS',
        });
        expect(calculateMoneyWeightedReturn([
            { recordedAt: start, amountInCents: BigInt(0) },
            { recordedAt: end, amountInCents: BigInt(0) },
        ], [])).toEqual({ percentage: null, method: 'UNAVAILABLE_STARTING_BALANCE' });
    });
    it('rejects cashflows outside the valuation interval instead of silently dropping them', () => {
        expect(calculateMoneyWeightedReturn([
            { recordedAt: start, amountInCents: BigInt(10000) },
            { recordedAt: end, amountInCents: BigInt(11000) },
        ], [{ occurredAt: new Date('2027-01-01T00:00:00Z'), type: 'DEPOSIT', amountInCents: BigInt(100) }]))
            .toEqual({ percentage: null, method: 'INVALID_CASHFLOWS' });
    });
});
