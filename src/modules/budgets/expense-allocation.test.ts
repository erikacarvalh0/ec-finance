import { describe, expect, it } from 'vitest';
import { calculateBudgetExpenseAmount } from './expense-allocation';

describe('budget allocation with card billing cycles', () => {
    const purchase = {
        amountInCents: BigInt(10001), installments: 3,
        date: new Date('2027-01-21T00:00:00Z'), type: 'VARIABLE' as const,
        paymentMethod: 'CREDIT' as const,
        card: { closingDay: 20, dueDay: 10 },
    };
    it('uses due month for card installments', () => {
        expect(calculateBudgetExpenseAmount(purchase, '2027-02')).toBe(BigInt(0));
        expect(calculateBudgetExpenseAmount(purchase, '2027-03')).toBe(BigInt(3334));
        expect(calculateBudgetExpenseAmount(purchase, '2027-04')).toBe(BigInt(3334));
        expect(calculateBudgetExpenseAmount(purchase, '2027-05')).toBe(BigInt(3333));
    });
    it('keeps non-card installment purchases on purchase-month schedule', () => {
        expect(calculateBudgetExpenseAmount({
            ...purchase, paymentMethod: 'PIX', card: null,
        }, '2027-01')).toBe(BigInt(3334));
    });
    it('falls back to purchase-month allocation if the card cycle is missing', () => {
        expect(calculateBudgetExpenseAmount({
            ...purchase, card: { closingDay: null, dueDay: null },
        }, '2027-01')).toBe(BigInt(3334));
    });
});
