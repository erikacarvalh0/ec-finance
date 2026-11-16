import { describe, expect, it } from 'vitest';
import { reconcileForecast } from './reconcile';
import type { ForecastMonth } from './schedule';

const january: ForecastMonth = {
    year: 2027,
    month: 1,
    expenseTotalInCents: BigInt(10000),
    incomeTotalInCents: BigInt(20000),
    balanceInCents: BigInt(10000),
    expenses: [{
        sourceId: 'rent',
        description: 'Rent',
        amountInCents: BigInt(10000),
        dueDate: new Date('2027-01-05T00:00:00.000Z'),
        installmentNumber: 1,
        installmentCount: 1,
    }],
    incomes: [{
        sourceId: 'salary',
        description: 'Salary',
        amountInCents: BigInt(20000),
        dueDate: new Date('2027-01-10T00:00:00.000Z'),
    }],
};

describe('monthly forecast reconciliation', () => {
    it('keeps untouched occurrences pending without changing totals', () => {
        const [month] = reconcileForecast([january], [], []);

        expect(month.expenses[0].status).toBe('PENDING');
        expect(month.pendingExpenseInCents).toBe(BigInt(10000));
        expect(month.settledExpenseInCents).toBe(BigInt(0));
        expect(month.expenseTotalInCents).toBe(BigInt(10000));
    });

    it('settles expenses at a recorded amount and preserves the original forecast', () => {
        const [month] = reconcileForecast([january], [{
            expenseId: 'rent',
            dueMonth: new Date('2027-01-01T00:00:00.000Z'),
            status: 'SETTLED',
            actualAmountInCents: BigInt(9500),
        }], []);

        expect(month.expenses[0].status).toBe('SETTLED');
        expect(month.expenses[0].amountInCents).toBe(BigInt(10000));
        expect(month.expenses[0].effectiveAmountInCents).toBe(BigInt(9500));
        expect(month.settledExpenseInCents).toBe(BigInt(9500));
        expect(month.pendingExpenseInCents).toBe(BigInt(0));
        expect(month.expenseTotalInCents).toBe(BigInt(9500));
    });

    it('removes canceled occurrences from expected totals but retains them in history', () => {
        const [month] = reconcileForecast([january], [{
            expenseId: 'rent',
            dueMonth: new Date('2027-01-01T00:00:00.000Z'),
            status: 'CANCELED',
            actualAmountInCents: null,
        }], []);

        expect(month.expenses[0].status).toBe('CANCELED');
        expect(month.expenseTotalInCents).toBe(BigInt(0));
        expect(month.expenses).toHaveLength(1);
    });

    it('handles income receipt and keeps other months unaffected', () => {
        const [month] = reconcileForecast([january], [], [{
            incomeId: 'salary',
            dueMonth: new Date('2027-01-01T00:00:00.000Z'),
            status: 'SETTLED',
            actualAmountInCents: BigInt(21000),
        }]);

        expect(month.incomes[0].status).toBe('SETTLED');
        expect(month.settledIncomeInCents).toBe(BigInt(21000));
        expect(month.balanceInCents).toBe(BigInt(11000));
    });

    it('changes only the selected installment month, not the entire recurring series', () => {
        const february = {
            ...january,
            year: 2027,
            month: 2,
            expenses: [{
                ...january.expenses[0],
                dueDate: new Date('2027-02-05T00:00:00.000Z'),
            }],
        };
        const months = reconcileForecast([january, february], [{
            expenseId: 'rent',
            dueMonth: new Date('2027-01-01T00:00:00.000Z'),
            status: 'CANCELED',
            actualAmountInCents: null,
        }], []);

        expect(months[0].expenseTotalInCents).toBe(BigInt(0));
        expect(months[1].expenseTotalInCents).toBe(BigInt(10000));
    });
});
