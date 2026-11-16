import { describe, expect, it } from 'vitest';
import { summarizePortfolioMonthlyHistory } from './portfolio-history';

const date = (value: string) => new Date(value + 'T00:00:00.000Z');

describe('monthly investment portfolio history', () => {
    it('uses last known valuation as of each month end, never a future snapshot', () => {
        const result = summarizePortfolioMonthlyHistory([
            { id: 'a', snapshots: [
                { recordedAt: date('2026-09-01'), amountInCents: BigInt(10000) },
                { recordedAt: date('2026-11-20'), amountInCents: BigInt(13000) },
            ] },
            { id: 'b', snapshots: [
                { recordedAt: date('2026-10-15'), amountInCents: BigInt(5000) },
            ] },
        ], 2026, 9, 3);
        expect(result).toEqual([
            { period: '2026-09', totalInCents: BigInt(10000), valuedCount: 1, unvaluedCount: 1 },
            { period: '2026-10', totalInCents: BigInt(15000), valuedCount: 2, unvaluedCount: 0 },
            { period: '2026-11', totalInCents: BigInt(18000), valuedCount: 2, unvaluedCount: 0 },
        ]);
    });

    it('supports year rollover and exact bigint arithmetic', () => {
        const result = summarizePortfolioMonthlyHistory([
            { id: 'a', snapshots: [{ recordedAt: date('2026-12-31'), amountInCents: BigInt('90071992547409930') }] },
        ], 2026, 12, 2);
        expect(result.map((item) => item.period)).toEqual(['2026-12', '2027-01']);
        expect(result[1].totalInCents).toBe(BigInt('90071992547409930'));
    });

    it('rejects invalid month windows', () => {
        expect(() => summarizePortfolioMonthlyHistory([], 2026, 13, 2)).toThrow();
        expect(() => summarizePortfolioMonthlyHistory([], 2026, 1, 0)).toThrow();
        expect(() => summarizePortfolioMonthlyHistory([], 2026, 1, 121)).toThrow();
    });
});
