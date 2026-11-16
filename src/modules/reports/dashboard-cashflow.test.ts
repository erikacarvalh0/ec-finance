import { describe, expect, it } from 'vitest';
import { summarizeDashboardRecordedCashflow } from './dashboard-cashflow';

describe('dashboard recorded cashflow', () => {
    it('shows an explicit empty state for accounts with no recorded activity', () => {
        expect(summarizeDashboardRecordedCashflow([{
            period: '2026-11', incomeInCents: BigInt(0), expenseInCents: BigInt(0), netInCents: BigInt(0),
        }])).toEqual({
            period: '2026-11', incomeInCents: BigInt(0), expenseInCents: BigInt(0),
            netInCents: BigInt(0), hasRecords: false,
        });
    });

    it('uses recorded database totals without replacing zero or negative balances with demo data', () => {
        expect(summarizeDashboardRecordedCashflow([{
            period: '2026-11', incomeInCents: BigInt(5000),
            expenseInCents: BigInt(9000), netInCents: BigInt(-4000),
        }])).toEqual({
            period: '2026-11', incomeInCents: BigInt(5000), expenseInCents: BigInt(9000),
            netInCents: BigInt(-4000), hasRecords: true,
        });
    });

    it('rejects missing or multiple periods rather than showing an unrelated month', () => {
        expect(() => summarizeDashboardRecordedCashflow([])).toThrow('Exactly one reporting month is required');
        expect(() => summarizeDashboardRecordedCashflow([
            { period: '2026-10', incomeInCents: BigInt(0), expenseInCents: BigInt(0), netInCents: BigInt(0) },
            { period: '2026-11', incomeInCents: BigInt(0), expenseInCents: BigInt(0), netInCents: BigInt(0) },
        ])).toThrow('Exactly one reporting month is required');
    });
});
