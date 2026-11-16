import { describe, expect, it } from 'vitest';
import { allocateInstallmentToMonth } from './installment-allocation';

describe('monthly installment budget allocation', () => {
    it('allocates exact cents across three months, preserving the total', () => {
        const base = { amountInCents: BigInt(10001), installments: 3, date: new Date('2027-01-15T00:00:00Z') };
        expect(allocateInstallmentToMonth(base, '2027-01')).toBe(BigInt(3334));
        expect(allocateInstallmentToMonth(base, '2027-02')).toBe(BigInt(3334));
        expect(allocateInstallmentToMonth(base, '2027-03')).toBe(BigInt(3333));
        expect(allocateInstallmentToMonth(base, '2027-04')).toBe(BigInt(0));
    });
    it('handles year boundaries and a single payment', () => {
        const base = { amountInCents: BigInt(15000), installments: 2, date: new Date('2026-12-28T00:00:00Z') };
        expect(allocateInstallmentToMonth(base, '2026-12')).toBe(BigInt(7500));
        expect(allocateInstallmentToMonth(base, '2027-01')).toBe(BigInt(7500));
        expect(allocateInstallmentToMonth({ ...base, installments: 1 }, '2027-01')).toBe(BigInt(0));
    });
    it('rejects invalid installments and negative amounts', () => {
        expect(() => allocateInstallmentToMonth({
            amountInCents: BigInt(100), installments: 0, date: new Date('2027-01-01'),
        }, '2027-01')).toThrow();
        expect(() => allocateInstallmentToMonth({
            amountInCents: BigInt(-100), installments: 1, date: new Date('2027-01-01'),
        }, '2027-01')).toThrow();
    });
});
