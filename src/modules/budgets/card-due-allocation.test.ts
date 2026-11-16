import { describe, expect, it } from 'vitest';
import { allocateCardInstallmentToDueMonth } from './card-due-allocation';

const card = { closingDay: 20, dueDay: 10 };

describe('card installment budget due-month allocation', () => {
    it('moves a purchase after closing into the next invoice and its due month', () => {
        const purchase = {
            amountInCents: BigInt(10001), installments: 3,
            date: new Date('2027-01-21T00:00:00Z'),
        };
        expect(allocateCardInstallmentToDueMonth(purchase, card, '2027-02')).toBe(BigInt(0));
        expect(allocateCardInstallmentToDueMonth(purchase, card, '2027-03')).toBe(BigInt(3334));
        expect(allocateCardInstallmentToDueMonth(purchase, card, '2027-04')).toBe(BigInt(3334));
        expect(allocateCardInstallmentToDueMonth(purchase, card, '2027-05')).toBe(BigInt(3333));
    });
    it('places a purchase before closing in the next due month', () => {
        expect(allocateCardInstallmentToDueMonth({
            amountInCents: BigInt(2500), installments: 1,
            date: new Date('2027-01-19T00:00:00Z'),
        }, card, '2027-02')).toBe(BigInt(2500));
    });
    it('rejects cards without a valid closing and due cycle', () => {
        expect(() => allocateCardInstallmentToDueMonth({
            amountInCents: BigInt(2500), installments: 1,
            date: new Date('2027-01-19T00:00:00Z'),
        }, { closingDay: null, dueDay: 10 }, '2027-02')).toThrow();
    });
});
