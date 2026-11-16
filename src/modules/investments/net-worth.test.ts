import { describe, expect, it } from 'vitest';
import { calculateNetWorth } from './net-worth';

describe('net worth including debts', () => {
    it('subtracts outstanding debts from asset values without rounding', () => {
        expect(calculateNetWorth({
            investmentsInCents: BigInt(5000000),
            otherAssetsInCents: BigInt(2000000),
            mortgageBalanceInCents: BigInt(3000000),
            otherDebtsInCents: BigInt(100000),
        })).toEqual({
            assetsInCents: BigInt(7000000),
            liabilitiesInCents: BigInt(3100000),
            netWorthInCents: BigInt(3900000),
        });
    });
    it('allows negative net worth when liabilities exceed assets', () => {
        expect(calculateNetWorth({
            investmentsInCents: BigInt(0),
            otherAssetsInCents: BigInt(0),
            mortgageBalanceInCents: BigInt(20000),
            otherDebtsInCents: BigInt(0),
        }).netWorthInCents).toBe(BigInt(-20000));
    });
    it('rejects negative balances instead of silently treating debt as an asset', () => {
        expect(() => calculateNetWorth({
            investmentsInCents: BigInt(0),
            otherAssetsInCents: BigInt(0),
            mortgageBalanceInCents: BigInt(-1),
            otherDebtsInCents: BigInt(0),
        })).toThrow();
    });
});
