import { describe, expect, it } from 'vitest';
import { compareCashflowScenarios } from './comparison';

const months = [{ period: '2026-11', incomeInCents: BigInt(10000), expenseInCents: BigInt(6000) }];

describe('side-by-side cashflow scenarios', () => {
    it('compares two scenarios against the same baseline without changing input', () => {
        const result = compareCashflowScenarios(months,
            { incomeChangePercent: 0, expenseChangePercent: 0 },
            { incomeChangePercent: 10, expenseChangePercent: 0 });
        expect(result).toEqual([{
            period: '2026-11',
            baselineBalanceInCents: BigInt(4000),
            firstBalanceInCents: BigInt(4000),
            secondBalanceInCents: BigInt(5000),
            differenceInCents: BigInt(1000),
        }]);
        expect(months[0].incomeInCents).toBe(BigInt(10000));
    });
    it('handles no months without inventing future financial records', () => {
        expect(compareCashflowScenarios([], { incomeChangePercent: 0, expenseChangePercent: 0 },
            { incomeChangePercent: 0, expenseChangePercent: 0 })).toEqual([]);
    });
    it('uses existing validation rules for invalid assumptions', () => {
        expect(() => compareCashflowScenarios(months,
            { incomeChangePercent: Number.NaN, expenseChangePercent: 0 },
            { incomeChangePercent: 0, expenseChangePercent: 0 })).toThrow();
    });
});
