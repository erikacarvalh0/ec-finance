import { describe, expect, it } from 'vitest';
import { reportCategoryWhere } from './category-query';

describe('report category query', () => {
    it('keeps the owner constraint for every selection', () => {
        expect(reportCategoryWhere('owner-a', 'cat-a')).toEqual({ userId: 'owner-a', categoryId: 'cat-a' });
        expect(reportCategoryWhere('owner-a', 'uncategorized')).toEqual({ userId: 'owner-a', categoryId: null });
        expect(reportCategoryWhere('owner-a')).toEqual({ userId: 'owner-a' });
    });
    it('rejects anonymous or blank category identifiers', () => {
        expect(() => reportCategoryWhere('', 'cat-a')).toThrow();
        expect(() => reportCategoryWhere('owner-a', ' ')).toThrow();
    });
});
