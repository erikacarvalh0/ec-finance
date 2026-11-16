import { describe, expect, it } from 'vitest';
import { calculateInvoiceCharges } from './charges';

const input = {
    period: '2026-11',
    closingDay: 10,
    dueDay: 20,
    totalInCents: BigInt(10000),
    dailyInterestBasisPoints: BigInt(10),
    lateFineBasisPoints: BigInt(200),
    lateFeeInCents: BigInt(50),
    credits: [],
    asOf: new Date('2026-11-21T00:00:00Z'),
};

describe('invoice interest, fines and fees', () => {
    it('keeps the closing day open and charges nothing through the due day', () => {
        for (const [date, isClosed] of [
            ['2026-11-10T23:59:59.999Z', false],
            ['2026-11-11T00:00:00Z', true],
            ['2026-11-20T23:59:59.999Z', true],
        ] as const) {
            expect(calculateInvoiceCharges({ ...input, asOf: new Date(date) }))
                .toMatchObject({ isClosed, overdueDays: 0, chargesInCents: BigInt(0) });
        }
    });

    it('starts interest the next UTC day and applies the fine and fee only once', () => {
        expect(calculateInvoiceCharges(input)).toMatchObject({
            overdueDays: 1,
            interestInCents: BigInt(10),
            fineInCents: BigInt(200),
            feeInCents: BigInt(50),
            balanceInCents: BigInt(10260),
        });
        expect(calculateInvoiceCharges({ ...input, asOf: new Date('2026-11-23') }))
            .toMatchObject({ interestInCents: BigInt(30), chargesInCents: BigInt(280) });
    });

    it('applies payments and refunds before accrual on their UTC date, regardless of order', () => {
        const credits = [
            { amountInCents: BigInt(2000), occurredAt: new Date('2026-11-22T23:59:59Z') },
            { amountInCents: BigInt(4000), occurredAt: new Date('2026-11-20T23:59:59Z') },
            { amountInCents: BigInt(9000), occurredAt: new Date('2026-11-24') },
        ];
        expect(calculateInvoiceCharges({ ...input, credits, asOf: new Date('2026-11-23') }))
            .toMatchObject({
                interestInCents: BigInt(14),
                fineInCents: BigInt(120),
                feeInCents: BigInt(50),
                balanceInCents: BigInt(4184),
            });
    });

    it('retains accrued charges when a later refund clears principal', () => {
        expect(calculateInvoiceCharges({
            ...input,
            asOf: new Date('2026-11-24'),
            credits: [{ amountInCents: BigInt(10000), occurredAt: new Date('2026-11-22') }],
        })).toMatchObject({ interestInCents: BigInt(10), balanceInCents: BigInt(260) });
    });

    it('does not charge fully credited invoices or create negative balances', () => {
        expect(calculateInvoiceCharges({
            ...input,
            credits: [{ amountInCents: BigInt(11000), occurredAt: new Date('2026-11-21') }],
        })).toMatchObject({ chargesInCents: BigInt(0), balanceInCents: BigInt(0) });
        expect(calculateInvoiceCharges({ ...input, totalInCents: BigInt(-500) }))
            .toMatchObject({ chargesInCents: BigInt(0), balanceInCents: BigInt(0) });
    });

    it('uses clamped leap-year and year-end due dates', () => {
        expect(calculateInvoiceCharges({
            ...input, period: '2028-02', closingDay: 10, dueDay: 31,
            asOf: new Date('2028-03-01'),
        }).overdueDays).toBe(1);
        expect(calculateInvoiceCharges({
            ...input, period: '2026-12', closingDay: 31, dueDay: 5,
            asOf: new Date('2027-01-06'),
        }).overdueDays).toBe(1);
    });

    it('rounds half up once per component, without floating-point money or daily rounding', () => {
        expect(calculateInvoiceCharges({
            ...input, totalInCents: BigInt(500), dailyInterestBasisPoints: BigInt(1),
            lateFineBasisPoints: BigInt(10), lateFeeInCents: BigInt(0),
            asOf: new Date('2026-11-30'),
        })).toMatchObject({ interestInCents: BigInt(1), fineInCents: BigInt(1) });
        expect(calculateInvoiceCharges({ ...input, totalInCents: BigInt('90071992547409930') })
            .interestInCents).toBe(BigInt('90071992547410'));
    });

    it('rejects invalid dates, cycles, rates, fees and credit amounts', () => {
        for (const invalid of [
            { asOf: new Date('invalid') }, { period: '2026-13' }, { closingDay: 0 },
            { dailyInterestBasisPoints: BigInt(-1) }, { lateFineBasisPoints: BigInt(-1) },
            { lateFeeInCents: BigInt(-1) },
            { credits: [{ amountInCents: BigInt(-1), occurredAt: new Date('2026-11-20') }] },
            { credits: [{ amountInCents: BigInt(1), occurredAt: new Date('invalid') }] },
        ]) {
            expect(() => calculateInvoiceCharges({ ...input, ...invalid })).toThrow();
        }
    });
});
