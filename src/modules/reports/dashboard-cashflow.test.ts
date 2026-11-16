import { describe, expect, it } from 'vitest';
import { summarizeDashboardRecordedCashflow } from './dashboard-cashflow';

describe('dashboard recorded cashflow', () => {
    it('shows an explicit empty state for accounts with no recorded activity', () => {
        expect(summarizeDashboardRecordedCashflow([{
            period: '2026-11', incomeInCents: 0n, expenseInCents: 0n, netInCents: 0n,
        }])).toEqual({
            period: '2026-11', incomeInCents: 0n, expenseInCents: 0n,
            netInCents: 0n, hasRecords: false,
        });
    });

    it('uses recorded database totals without replacing zero or negative balances with demo data', () => {
        expect(summarizeDashboardRecordedCashflow([{
            period: '2026-11', incomeInCents: 5000n,
            expenseInCents: 9000n, netInCents: -4000n,
        }])).toEqual({
            period: '2026-11', incomeInCents: 5000n, expenseInCents: 9000n,
            netInCents: -4000n, hasRecords: true,
        });
    });

    it('rejects missing or multiple periods rather than showing an unrelated month', () => {
        expect(() => summarizeDashboardRecordedCashflow([])).toThrow('Exactly one reporting month is required');
        expect(() => summarizeDashboardRecordedCashflow([
            { period: '2026-10', incomeInCents: 0n, expenseInCents: 0n, netInCents: 0n },
            { period: '2026-11', incomeInCents: 0n, expenseInCents: 0n, netInCents: 0n },
        ])).toThrow('Exactly one reporting month is required');
    });
});
