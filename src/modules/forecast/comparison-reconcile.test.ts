import { describe, expect, it } from 'vitest';
import { reconcileForecast } from './reconcile';
import { compareCashflowScenarios } from './comparison';
import type { ForecastMonth } from './schedule';

describe('scenario comparison with reconciled invoice installment', () => {
    it('uses the settled installment amount, not the original forecast or both amounts', () => {
        const forecast: ForecastMonth = {
            year: 2027,
            month: 1,
            incomeTotalInCents: BigInt(20000),
            expenseTotalInCents: BigInt(10000),
            balanceInCents: BigInt(10000),
            expenses: [{
                sourceId: 'invoice-installment',
                description: 'Card installment 1/3',
                amountInCents: BigInt(10000),
                dueDate: new Date('2027-01-10T00:00:00.000Z'),
                installmentNumber: 1,
                installmentCount: 3,
            }],
            incomes: [{
                sourceId: 'salary',
                description: 'Salary',
                amountInCents: BigInt(20000),
                dueDate: new Date('2027-01-05T00:00:00.000Z'),
            }],
        };
        const [settled] = reconcileForecast([forecast], [{
            expenseId: 'invoice-installment',
            dueMonth: new Date('2027-01-01T00:00:00.000Z'),
            status: 'SETTLED',
            actualAmountInCents: BigInt(9000),
        }], []);
        const [comparison] = compareCashflowScenarios([{
            period: '2027-01',
            incomeInCents: settled.incomeTotalInCents,
            expenseInCents: settled.expenseTotalInCents,
        }], { incomeChangePercent: 0, expenseChangePercent: 0 },
        { incomeChangePercent: 0, expenseChangePercent: 10 });
        expect(settled.expenseTotalInCents).toBe(BigInt(9000));
        expect(comparison.baselineBalanceInCents).toBe(BigInt(11000));
        expect(comparison.firstBalanceInCents).toBe(BigInt(11000));
        expect(comparison.secondBalanceInCents).toBe(BigInt(10100));
        expect(comparison.differenceInCents).toBe(BigInt(-900));
    });
});
