import { describe, expect, it } from 'vitest';
import { calculateInvestmentSimpleReturn } from './percentage-return';

const valuation = (amount: number, date: string) => ({
    amountInCents: BigInt(amount),
    recordedAt: new Date(date),
});
const flow = (type: 'DEPOSIT' | 'WITHDRAWAL', amount: number, date: string) => ({
    type,
    amountInCents: BigInt(amount),
    occurredAt: new Date(date),
});

describe('investment percentage return', () => {
    it.each([
        [20011, 0.06],
        [19989, -0.06],
        [20001, 0.01],
        [19999, -0.01],
        [20008, 0.04],
        [20000, 0],
    ])('rounds the return for a closing balance of %i to %s percent', (closing, percentage) => {
        expect(calculateInvestmentSimpleReturn([
            valuation(20000, '2026-01-01'),
            valuation(closing, '2026-02-01'),
        ], [])).toEqual({ percentage, method: 'SIMPLE_RETURN' });
    });

    it('calculates a simple return without external cash flows', () => {
        expect(calculateInvestmentSimpleReturn([
            valuation(10000, '2026-01-01'),
            valuation(11000, '2026-02-01'),
        ], [])).toEqual({
            percentage: 10,
            method: 'SIMPLE_RETURN',
        });
    });

    it('does not misrepresent a deposit as a gain', () => {
        expect(calculateInvestmentSimpleReturn([
            valuation(10000, '2026-01-01'),
            valuation(16000, '2026-02-01'),
        ], [flow('DEPOSIT', 5000, '2026-01-15')])).toEqual({
            percentage: null,
            method: 'UNAVAILABLE_EXTERNAL_CASHFLOWS',
        });
    });

    it('does not misrepresent a withdrawal as a loss', () => {
        expect(calculateInvestmentSimpleReturn([
            valuation(20000, '2026-01-01'),
            valuation(14000, '2026-02-01'),
        ], [flow('WITHDRAWAL', 7000, '2026-01-15')])).toEqual({
            percentage: null,
            method: 'UNAVAILABLE_EXTERNAL_CASHFLOWS',
        });
    });

    it('ignores cash flows outside the valuation interval', () => {
        expect(calculateInvestmentSimpleReturn([
            valuation(10000, '2026-01-10'),
            valuation(11000, '2026-02-10'),
        ], [
            flow('DEPOSIT', 1000, '2026-01-09'),
            flow('WITHDRAWAL', 500, '2026-02-11'),
        ])).toEqual({
            percentage: 10,
            method: 'SIMPLE_RETURN',
        });
    });

    it('requires at least two chronologically distinct valuations', () => {
        expect(calculateInvestmentSimpleReturn([], [])).toEqual({
            percentage: null,
            method: 'UNAVAILABLE_VALUATIONS',
        });
        expect(calculateInvestmentSimpleReturn([
            valuation(10000, '2026-01-01'),
        ], [])).toEqual({
            percentage: null,
            method: 'UNAVAILABLE_VALUATIONS',
        });
        expect(calculateInvestmentSimpleReturn([
            valuation(10000, '2026-01-01'),
            valuation(11000, '2026-01-01'),
        ], [])).toEqual({
            percentage: null,
            method: 'UNAVAILABLE_VALUATIONS',
        });
    });

    it('does not divide by zero or treat a zero opening balance as profit', () => {
        expect(calculateInvestmentSimpleReturn([
            valuation(0, '2026-01-01'),
            valuation(1000, '2026-02-01'),
        ], [])).toEqual({
            percentage: null,
            method: 'UNAVAILABLE_STARTING_BALANCE',
        });
    });

    it('supports negative returns and sorts valuations by date', () => {
        expect(calculateInvestmentSimpleReturn([
            valuation(8000, '2026-02-01'),
            valuation(10000, '2026-01-01'),
        ], [])).toEqual({
            percentage: -20,
            method: 'SIMPLE_RETURN',
        });
    });

    it('avoids unsafe bigint to number conversion for large balances', () => {
        expect(calculateInvestmentSimpleReturn([
            { amountInCents: BigInt('90071992547409930'), recordedAt: new Date('2026-01-01') },
            { amountInCents: BigInt('99079191802150923'), recordedAt: new Date('2026-02-01') },
        ], [])).toEqual({
            percentage: 10,
            method: 'SIMPLE_RETURN',
        });
    });
});
