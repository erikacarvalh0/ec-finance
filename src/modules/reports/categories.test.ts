import { describe, expect, it } from 'vitest';
import { summarizeCategorySpending } from './categories';

describe('category spending breakdown', () => {
    it('sorts categories by spending and calculates exact shares', () => {
        const result = summarizeCategorySpending([
            { categoryId: 'home', name: 'Casa', spentInCents: BigInt(20000) },
            { categoryId: 'food', name: 'Mercado', spentInCents: BigInt(50000) },
            { categoryId: 'empty', name: 'Lazer', spentInCents: BigInt(0) },
        ]);

        expect(result.totalInCents).toBe(BigInt(70000));
        expect(result.categories.map((item) => item.categoryId)).toEqual(['food', 'home']);
        expect(result.categories.map((item) => item.percentage)).toEqual([71, 29]);
    });

    it('returns a zero total and no bars when categories have no spending', () => {
        expect(summarizeCategorySpending([
            { categoryId: 'a', name: 'Casa', spentInCents: BigInt(0) },
        ])).toEqual({ totalInCents: BigInt(0), categories: [] });
    });

    it('does not allow negative recorded spending to distort percentage charts', () => {
        const result = summarizeCategorySpending([
            { categoryId: 'a', name: 'Casa', spentInCents: BigInt(-100) },
            { categoryId: 'b', name: 'Mercado', spentInCents: BigInt(300) },
        ]);
        expect(result.totalInCents).toBe(BigInt(300));
        expect(result.categories).toEqual([
            { categoryId: 'b', name: 'Mercado', spentInCents: BigInt(300), percentage: 100 },
        ]);
    });
});
