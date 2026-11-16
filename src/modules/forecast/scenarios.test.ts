import { describe, expect, it } from 'vitest';
import { simulateCashflow, validateScenario } from './scenarios';

const months = [
    { period: '2026-11', incomeInCents: BigInt(100000), expenseInCents: BigInt(60000) },
    { period: '2026-12', incomeInCents: BigInt(110000), expenseInCents: BigInt(70000) },
];

describe('read-only what-if scenarios', () => {
    it('calculates adjusted monthly balances and cumulative difference without mutating originals', () => {
        const result = simulateCashflow(months, { incomeChangePercent: 10, expenseChangePercent: -20 });
        expect(result.map(x => ({
            income: x.simulatedIncomeInCents,
            expense: x.simulatedExpenseInCents,
            balance: x.simulatedBalanceInCents,
            impact: x.monthlyImpactInCents,
        }))).toEqual([
            { income: BigInt(110000), expense: BigInt(48000), balance: BigInt(62000), impact: BigInt(22000) },
            { income: BigInt(121000), expense: BigInt(56000), balance: BigInt(65000), impact: BigInt(25000) },
        ]);
        expect(result.at(-1)?.cumulativeImpactInCents).toBe(BigInt(47000));
        expect(months[0].incomeInCents).toBe(BigInt(100000));
    });

    it('rounds amounts with integer-cent precision', () => {
        const result = simulateCashflow([
            { period: '2026-11', incomeInCents: BigInt(101), expenseInCents: BigInt(103) },
        ], { incomeChangePercent: 50, expenseChangePercent: -50 });
        expect(result[0].simulatedIncomeInCents).toBe(BigInt(152));
        expect(result[0].simulatedExpenseInCents).toBe(BigInt(52));
    });

    it('prevents negative costs, impossible income reductions, NaN and unbounded changes', () => {
        for (const scenario of [
            { incomeChangePercent: -101, expenseChangePercent: 0 },
            { incomeChangePercent: 0, expenseChangePercent: -101 },
            { incomeChangePercent: Number.NaN, expenseChangePercent: 0 },
            { incomeChangePercent: 1001, expenseChangePercent: 0 },
        ]) {
            expect(() => validateScenario(scenario)).toThrow();
        }
    });

    it('rejects malformed time series and negative baseline amounts', () => {
        expect(() => simulateCashflow([
            { period: '2026-13', incomeInCents: BigInt(100), expenseInCents: BigInt(0) },
        ], { incomeChangePercent: 0, expenseChangePercent: 0 })).toThrow();
        expect(() => simulateCashflow([
            { period: '2026-11', incomeInCents: BigInt(-1), expenseInCents: BigInt(0) },
        ], { incomeChangePercent: 0, expenseChangePercent: 0 })).toThrow();
    });
});
