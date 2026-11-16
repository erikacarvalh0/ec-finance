import { describe, expect, it } from 'vitest';
import { summarizeInvestmentPerformance } from './performance';

describe('investment performance with external cash flows', () => {
    it.each([1, 2])('requires distinct valuation dates to estimate gain with %i snapshots', (count) => {
        const recordedAt = new Date('2026-11-01T00:00:00.000Z');
        const result = summarizeInvestmentPerformance(
            Array.from({ length: count }, (_, index) => ({
                amountInCents: BigInt(10000 + index * 1000),
                recordedAt,
            })),
            [{ type: 'DEPOSIT', amountInCents: BigInt(5000), occurredAt: recordedAt }],
        );

        expect(result).toEqual({
            currentBalanceInCents: BigInt(10000 + (count - 1) * 1000),
            depositedInCents: BigInt(5000),
            withdrawnInCents: BigInt(0),
            netCashflowInCents: BigInt(5000),
            estimatedGainInCents: null,
        });
    });

    it('separates deposits from valuation increases', () => {
        const result = summarizeInvestmentPerformance(
            [
                { amountInCents: BigInt(10000), recordedAt: new Date('2026-11-01T00:00:00.000Z') },
                { amountInCents: BigInt(16000), recordedAt: new Date('2026-11-30T00:00:00.000Z') },
            ],
            [{ type: 'DEPOSIT', amountInCents: BigInt(5000), occurredAt: new Date('2026-11-15T00:00:00.000Z') }],
        );

        expect(result).toEqual({
            currentBalanceInCents: BigInt(16000),
            depositedInCents: BigInt(5000),
            withdrawnInCents: BigInt(0),
            netCashflowInCents: BigInt(5000),
            estimatedGainInCents: BigInt(1000),
        });
    });

    it('treats withdrawals as cash leaving the investment, not investment losses', () => {
        const result = summarizeInvestmentPerformance(
            [
                { amountInCents: BigInt(20000), recordedAt: new Date('2026-11-01T00:00:00.000Z') },
                { amountInCents: BigInt(14000), recordedAt: new Date('2026-11-30T00:00:00.000Z') },
            ],
            [{ type: 'WITHDRAWAL', amountInCents: BigInt(7000), occurredAt: new Date('2026-11-15T00:00:00.000Z') }],
        );

        expect(result.estimatedGainInCents).toBe(BigInt(1000));
        expect(result.withdrawnInCents).toBe(BigInt(7000));
    });

    it('uses the most recent valuation and only cash flows after first snapshot', () => {
        const result = summarizeInvestmentPerformance(
            [
                { amountInCents: BigInt(10000), recordedAt: new Date('2026-11-10T00:00:00.000Z') },
                { amountInCents: BigInt(12000), recordedAt: new Date('2026-11-20T00:00:00.000Z') },
            ],
            [
                { type: 'DEPOSIT', amountInCents: BigInt(500), occurredAt: new Date('2026-11-02T00:00:00.000Z') },
                { type: 'DEPOSIT', amountInCents: BigInt(1000), occurredAt: new Date('2026-11-15T00:00:00.000Z') },
            ],
        );

        expect(result.netCashflowInCents).toBe(BigInt(1000));
        expect(result.estimatedGainInCents).toBe(BigInt(1000));
    });

    it('avoids pretending to know returns without any valuation', () => {
        expect(summarizeInvestmentPerformance([], [
            { type: 'DEPOSIT', amountInCents: BigInt(10000), occurredAt: new Date('2026-11-01T00:00:00.000Z') },
        ])).toEqual({
            currentBalanceInCents: null,
            depositedInCents: BigInt(10000),
            withdrawnInCents: BigInt(0),
            netCashflowInCents: BigInt(10000),
            estimatedGainInCents: null,
        });
    });
});
