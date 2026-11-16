import { describe, expect, it } from 'vitest';
import { calculateBudgetProgress, monthBounds, summarizeCategoryBudgets } from './calculations';

describe('monthly category budgets', () => {
    it('uses UTC month boundaries and rejects invalid periods', () => {
        expect(monthBounds('2027-02')).toEqual({
            start: new Date('2027-02-01T00:00:00.000Z'),
            end: new Date('2027-03-01T00:00:00.000Z'),
        });
        expect(() => monthBounds('2027-13')).toThrow();
    });

    it('classifies spending at threshold, exceeded, and under limit using exact cents', () => {
        expect(calculateBudgetProgress(BigInt(7999), BigInt(10000))).toEqual({
            percentage: 79, status: 'ON_TRACK', remainingInCents: BigInt(2001),
        });
        expect(calculateBudgetProgress(BigInt(8000), BigInt(10000)).status).toBe('NEAR_LIMIT');
        expect(calculateBudgetProgress(BigInt(10000), BigInt(10000)).status).toBe('AT_LIMIT');
        expect(calculateBudgetProgress(BigInt(10001), BigInt(10000)).status).toBe('OVER_LIMIT');
    });

    it('counts categorized manual expenses and card transactions but not explicitly linked duplicates', () => {
        const rows = summarizeCategoryBudgets({
            categories: [{ id: 'groceries', name: 'Mercado' }],
            budgets: [{ categoryId: 'groceries', limitInCents: BigInt(30000) }],
            expenses: [
                { id: 'manual-1', categoryId: 'groceries', amountInCents: BigInt(12000), linkedTransactionId: null },
                { id: 'manual-linked', categoryId: 'groceries', amountInCents: BigInt(5000), linkedTransactionId: 'card-1' },
            ],
            transactions: [{ id: 'card-1', categoryId: 'groceries', amountInCents: BigInt(5000) }],
        });
        expect(rows).toEqual([expect.objectContaining({
            categoryId: 'groceries',
            spentInCents: BigInt(17000),
            remainingInCents: BigInt(13000),
        })]);
    });

    it('includes unbudgeted categories and ignores uncategorized purchases', () => {
        const rows = summarizeCategoryBudgets({
            categories: [{ id: 'a', name: 'Lazer' }, { id: 'b', name: 'Casa' }],
            budgets: [{ categoryId: 'a', limitInCents: BigInt(10000) }],
            expenses: [{ id: 'expense', categoryId: 'b', amountInCents: BigInt(2500), linkedTransactionId: null }],
            transactions: [{ id: 'uncategorized', categoryId: null, amountInCents: BigInt(3000) }],
        });
        expect(rows.find((item) => item.categoryId === 'b')).toEqual(expect.objectContaining({
            spentInCents: BigInt(2500), limitInCents: null, status: 'NO_BUDGET',
        }));
    });
});
