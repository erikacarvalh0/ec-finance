import { describe, expect, it } from 'vitest';
import { summarizeAnnualCashflow } from './annual';

const month = (period: string, income: number, expense: number) => ({
    period,
    incomeInCents: BigInt(income),
    expenseInCents: BigInt(expense),
    netInCents: BigInt(income - expense),
});

describe('annual recorded cashflow comparison', () => {
    it('aggregates 12 recorded months into a single annual total', () => {
        const result = summarizeAnnualCashflow(2026, [
            month('2026-01', 20000, 15000),
            month('2026-02', 10000, 3000),
        ]);
        expect(result).toEqual({
            year: 2026,
            incomeInCents: BigInt(30000),
            expenseInCents: BigInt(18000),
            netInCents: BigInt(12000),
            monthsWithRecords: 2,
        });
    });

    it('returns zero totals for a year with no recorded values', () => {
        expect(summarizeAnnualCashflow(2025, [])).toEqual({
            year: 2025,
            incomeInCents: BigInt(0),
            expenseInCents: BigInt(0),
            netInCents: BigInt(0),
            monthsWithRecords: 0,
        });
    });

    it('rejects months from another year and duplicates rather than silently double-counting', () => {
        expect(() => summarizeAnnualCashflow(2026, [month('2025-12', 1, 1)])).toThrow();
        expect(() => summarizeAnnualCashflow(2026, [
            month('2026-01', 1, 1), month('2026-01', 1, 1),
        ])).toThrow();
    });

    it('handles negative net balances and preserves exact bigint totals', () => {
        const large = BigInt('90071992547409930');
        const result = summarizeAnnualCashflow(2026, [{
            period: '2026-12',
            incomeInCents: BigInt(0),
            expenseInCents: large,
            netInCents: -large,
        }]);
        expect(result.netInCents).toBe(-large);
    });

    it('rejects malformed year and periods', () => {
        expect(() => summarizeAnnualCashflow(0, [])).toThrow();
        expect(() => summarizeAnnualCashflow(2026, [month('2026-13', 1, 1)])).toThrow();
    });
});
