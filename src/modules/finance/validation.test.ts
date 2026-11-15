import { describe, expect, it } from 'vitest';
import {
    expenseInputSchema,
    incomeInputSchema,
    investmentSnapshotInputSchema,
} from './validation';

describe('expense validation', () => {
    const base = {
        description: 'Groceries',
        amountInCents: '12500',
        paymentMethod: 'PIX',
        type: 'VARIABLE',
    };

    it('defaults installments to one and permits an absent date', () => {
        const result = expenseInputSchema.parse(base);

        expect(result.installments).toBe(1);
        expect(result.date).toBeUndefined();
    });

    it.each(['PIX', 'CREDIT', 'DEBIT', 'AUTOMATIC_DEBIT', 'OTHER'])(
        'accepts %s as payment method',
        (paymentMethod) => {
            expect(expenseInputSchema.parse({ ...base, paymentMethod }).paymentMethod)
                .toBe(paymentMethod);
        },
    );

    it.each([0, -1, 1.2, 121])('rejects invalid installment count %s', (installments) => {
        expect(expenseInputSchema.safeParse({ ...base, installments }).success)
            .toBe(false);
    });

    it('rejects fractional and negative cents', () => {
        expect(expenseInputSchema.safeParse({ ...base, amountInCents: '12.5' }).success)
            .toBe(false);
        expect(expenseInputSchema.safeParse({ ...base, amountInCents: '-100' }).success)
            .toBe(false);
    });

    it('rejects an invalid expense date', () => {
        expect(expenseInputSchema.safeParse({ ...base, date: '2026-02-30' }).success)
            .toBe(false);
    });
});

describe('income validation', () => {
    const base = {
        amountInCents: '150000',
        type: 'SALARY',
    };

    it('accepts salary and other income without recurring fields', () => {
        expect(incomeInputSchema.safeParse(base).success).toBe(true);
        expect(incomeInputSchema.safeParse({ ...base, type: 'OTHER' }).success).toBe(true);
    });

    it('requires responsible person, description and date for recurring income', () => {
        expect(incomeInputSchema.safeParse({ ...base, type: 'RECURRING' }).success)
            .toBe(false);
        expect(incomeInputSchema.safeParse({
            ...base,
            type: 'RECURRING',
            responsible: 'Employer',
            description: 'Monthly rent',
            date: '2026-11-15',
        }).success).toBe(true);
    });
});

describe('investment valuation validation', () => {
    it('accepts updated values including zero and negative changes', () => {
        expect(investmentSnapshotInputSchema.parse({
            amountInCents: '0',
            recordedAt: '2026-11-15',
        }).amountInCents).toBe('0');
    });

    it('rejects negative valuations and invalid dates', () => {
        expect(investmentSnapshotInputSchema.safeParse({
            amountInCents: '-500',
            recordedAt: '2026-11-15',
        }).success).toBe(false);
        expect(investmentSnapshotInputSchema.safeParse({
            amountInCents: '100',
            recordedAt: '2026-02-30',
        }).success).toBe(false);
    });
});
