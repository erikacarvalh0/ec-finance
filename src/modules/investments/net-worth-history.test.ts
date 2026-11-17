import { describe, expect, it } from 'vitest';
import { summarizeNetWorthHistory } from './net-worth-history';

describe('monthly net worth history', () => {
    const balances = { investmentsInCents: BigInt(1000), otherAssetsInCents: BigInt(2000),
        mortgageBalanceInCents: BigInt(500), otherDebtsInCents: BigInt(100) };
    it('uses the latest snapshot each month instead of summing repeated balances', () => {
        const rows = summarizeNetWorthHistory([
            { ...balances, recordedAt: new Date('2027-01-01T00:00:00Z') },
            { ...balances, recordedAt: new Date('2027-02-01T00:00:00Z') },
            { ...balances, mortgageBalanceInCents: BigInt(400), recordedAt: new Date('2027-01-31T00:00:00Z') },
        ]);
        expect(rows.map(row => [row.period, row.netWorthInCents])).toEqual([
            ['2027-01', BigInt(2500)], ['2027-02', BigInt(2400)],
        ]);
    });
    it('does not fabricate snapshots for missing months', () => {
        expect(summarizeNetWorthHistory([])).toEqual([]);
    });
});
