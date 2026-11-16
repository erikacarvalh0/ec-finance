import { describe, expect, it } from 'vitest';
import { summarizeInvestmentPortfolio } from './portfolio';

const date = (value: string) => new Date(value + 'T00:00:00.000Z');

describe('investment portfolio overview', () => {
    it('uses each investment latest valuation, regardless of input order', () => {
        const result = summarizeInvestmentPortfolio([
            { id: 'a', name: 'Reserve', snapshots: [
                { amountInCents: BigInt(12000), recordedAt: date('2026-11-30') },
                { amountInCents: BigInt(10000), recordedAt: date('2026-11-01') },
            ] },
            { id: 'b', name: 'Stocks', snapshots: [
                { amountInCents: BigInt(5000), recordedAt: date('2026-11-20') },
            ] },
        ]);
        expect(result.totalInCents).toBe(BigInt(17000));
        expect(result.valuedCount).toBe(2);
        expect(result.unvaluedCount).toBe(0);
        expect(result.latestValuationAt).toEqual(date('2026-11-30'));
    });

    it('excludes investments without a valuation rather than assuming zero', () => {
        const result = summarizeInvestmentPortfolio([
            { id: 'a', name: 'Unvalued', snapshots: [] },
        ]);
        expect(result.totalInCents).toBe(BigInt(0));
        expect(result.valuedCount).toBe(0);
        expect(result.unvaluedCount).toBe(1);
        expect(result.latestValuationAt).toBeNull();
    });

    it('preserves exact bigint cents and does not count earlier valuations twice', () => {
        const result = summarizeInvestmentPortfolio([
            { id: 'a', name: 'Large', snapshots: [
                { amountInCents: BigInt('90071992547409930'), recordedAt: date('2026-11-01') },
                { amountInCents: BigInt('90071992547409931'), recordedAt: date('2026-11-02') },
            ] },
        ]);
        expect(result.totalInCents).toBe(BigInt('90071992547409931'));
    });
});
