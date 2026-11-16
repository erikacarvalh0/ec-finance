import { describe, expect, it } from 'vitest';
import { filterReportEntriesByCategory } from './category-filter';

describe('report category filtering', () => {
    const entries = [
        { id: 'a', categoryId: 'groceries', amountInCents: BigInt(1000) },
        { id: 'b', categoryId: null, amountInCents: BigInt(2000) },
        { id: 'c', categoryId: 'transport', amountInCents: BigInt(3000) },
    ];
    it('returns all entries when no category filter is selected', () => {
        expect(filterReportEntriesByCategory(entries)).toEqual(entries);
    });
    it('selects only the requested category', () => {
        expect(filterReportEntriesByCategory(entries, 'groceries')).toEqual([entries[0]]);
    });
    it('supports uncategorized expenses explicitly', () => {
        expect(filterReportEntriesByCategory(entries, 'uncategorized')).toEqual([entries[1]]);
    });
    it('rejects an empty category identifier', () => {
        expect(() => filterReportEntriesByCategory(entries, '')).toThrow();
    });
});
