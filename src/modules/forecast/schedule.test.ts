import { describe, expect, it } from 'vitest';
import {
    addMonthsClamped,
    buildInstallments,
    buildMonthlyForecast,
} from './schedule';

describe('installment scheduling', () => {
    it('distributes every cent without losing rounding leftovers', () => {
        const items = buildInstallments(
            'expense-a',
            'Laptop',
            BigInt(10001),
            new Date('2026-11-15T00:00:00.000Z'),
            3,
        );

        expect(items.map((item) => item.amountInCents)).toEqual([
            BigInt(3334),
            BigInt(3334),
            BigInt(3333),
        ]);
        expect(items.map((item) => item.installmentNumber)).toEqual([1, 2, 3]);
        expect(items.reduce((sum, item) => sum + item.amountInCents, BigInt(0)))
            .toBe(BigInt(10001));
    });

    it('clamps the last day to the target calendar month, including leap years', () => {
        expect(addMonthsClamped(new Date('2028-01-31T00:00:00.000Z'), 1)
            .toISOString()).toBe('2028-02-29T00:00:00.000Z');
        expect(addMonthsClamped(new Date('2026-01-31T00:00:00.000Z'), 1)
            .toISOString()).toBe('2026-02-28T00:00:00.000Z');
    });

    it('does not create duplicate installments for one payment', () => {
        const items = buildInstallments(
            'expense-a',
            'Single purchase',
            BigInt(2000),
            new Date('2026-11-15T00:00:00.000Z'),
            1,
        );

        expect(items).toHaveLength(1);
        expect(items[0].amountInCents).toBe(BigInt(2000));
    });

    it('rejects invalid installment counts', () => {
        expect(() => buildInstallments('e', 'x', BigInt(200), new Date(), 0))
            .toThrow();
        expect(() => buildInstallments('e', 'x', BigInt(200), new Date(), 121))
            .toThrow();
    });
});

describe('monthly cashflow forecast', () => {
    const start = new Date('2026-11-01T00:00:00.000Z');

    it('projects installments over future months and recurring income from its start date', () => {
        const months = buildMonthlyForecast({
            start,
            monthCount: 3,
            expenses: [{
                id: 'expense-a',
                description: 'Phone',
                amountInCents: BigInt(10001),
                date: new Date('2026-11-15T00:00:00.000Z'),
                createdAt: start,
                installments: 3,
                type: 'VARIABLE',
                paymentMethod: 'CREDIT',
            }],
            incomes: [{
                id: 'income-a',
                description: 'Rent',
                amountInCents: BigInt(30000),
                date: new Date('2026-12-10T00:00:00.000Z'),
                createdAt: start,
                type: 'RECURRING',
            }],
        });

        expect(months.map((month) => month.expenseTotalInCents))
            .toEqual([BigInt(3334), BigInt(3334), BigInt(3333)]);
        expect(months.map((month) => month.incomeTotalInCents))
            .toEqual([BigInt(0), BigInt(30000), BigInt(30000)]);
        expect(months[1].balanceInCents).toBe(BigInt(26666));
    });

    it('projects fixed single-payment expenses monthly, without repeating variable expenses', () => {
        const months = buildMonthlyForecast({
            start,
            monthCount: 3,
            expenses: [
                {
                    id: 'fixed',
                    description: 'Internet',
                    amountInCents: BigInt(9900),
                    date: start,
                    createdAt: start,
                    installments: 1,
                    type: 'FIXED',
                    paymentMethod: 'AUTOMATIC_DEBIT',
                },
                {
                    id: 'variable',
                    description: 'Groceries',
                    amountInCents: BigInt(1500),
                    date: start,
                    createdAt: start,
                    installments: 1,
                    type: 'VARIABLE',
                    paymentMethod: 'PIX',
                },
            ],
            incomes: [],
        });

        expect(months.map((month) => month.expenseTotalInCents))
            .toEqual([BigInt(11400), BigInt(9900), BigInt(9900)]);
    });

    it('uses the creation date when the expense date is optional', () => {
        const months = buildMonthlyForecast({
            start,
            monthCount: 2,
            expenses: [{
                id: 'undated',
                description: 'Taxi',
                amountInCents: BigInt(800),
                date: null,
                createdAt: new Date('2026-11-20T12:00:00.000Z'),
                installments: 1,
                type: 'VARIABLE',
                paymentMethod: 'DEBIT',
            }],
            incomes: [],
        });

        expect(months[0].expenseTotalInCents).toBe(BigInt(800));
        expect(months[1].expenseTotalInCents).toBe(BigInt(0));
    });

    it('does not duplicate a fixed installment as a monthly recurring expense', () => {
        const months = buildMonthlyForecast({
            start,
            monthCount: 4,
            expenses: [{
                id: 'fixed-installment',
                description: 'Equipment',
                amountInCents: BigInt(3000),
                date: start,
                createdAt: start,
                installments: 2,
                type: 'FIXED',
                paymentMethod: 'CREDIT',
            }],
            incomes: [],
        });

        expect(months.map((month) => month.expenseTotalInCents))
            .toEqual([BigInt(1500), BigInt(1500), BigInt(0), BigInt(0)]);
    });

    it('does not treat salary or other income as recurring', () => {
        const months = buildMonthlyForecast({
            start,
            monthCount: 2,
            expenses: [],
            incomes: [{
                id: 'salary',
                description: null,
                amountInCents: BigInt(150000),
                date: null,
                createdAt: start,
                type: 'SALARY',
            }],
        });

        expect(months.map((month) => month.incomeTotalInCents))
            .toEqual([BigInt(150000), BigInt(0)]);
    });

    it('rejects invalid forecast windows', () => {
        expect(() => buildMonthlyForecast({
            start,
            monthCount: 0,
            expenses: [],
            incomes: [],
        })).toThrow();
    });
});

describe('recurrence end dates', () => {
    const start = new Date('2026-11-01T00:00:00.000Z');

    it('stops a fixed expense after its final configured month', () => {
        const months = buildMonthlyForecast({
            start,
            monthCount: 4,
            expenses: [{
                id: 'rent',
                description: 'Rent',
                amountInCents: BigInt(10000),
                date: start,
                createdAt: start,
                endsOn: new Date('2026-12-31T00:00:00.000Z'),
                installments: 1,
                type: 'FIXED',
                paymentMethod: 'PIX',
            }],
            incomes: [],
        });

        expect(months.map((month) => month.expenseTotalInCents)).toEqual([
            BigInt(10000), BigInt(10000), BigInt(0), BigInt(0),
        ]);
    });

    it('stops recurring income without removing past occurrences', () => {
        const months = buildMonthlyForecast({
            start,
            monthCount: 4,
            expenses: [],
            incomes: [{
                id: 'income',
                amountInCents: BigInt(25000),
                description: 'Rent paid',
                date: start,
                createdAt: start,
                endsOn: new Date('2027-01-15T00:00:00.000Z'),
                type: 'RECURRING',
            }],
        });

        expect(months.map((month) => month.incomeTotalInCents)).toEqual([
            BigInt(25000), BigInt(25000), BigInt(25000), BigInt(0),
        ]);
    });
});
