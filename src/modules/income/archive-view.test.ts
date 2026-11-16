import { describe, expect, it } from 'vitest';
import { parseIncomeArchiveView } from './archive-view';

describe('income archived history selection', () => {
    it('defaults to active records', () => {
        expect(parseIncomeArchiveView(undefined)).toBe(false);
        expect(parseIncomeArchiveView('')).toBe(false);
    });

    it('selects archived records only for the explicit archived value', () => {
        expect(parseIncomeArchiveView('archived')).toBe(true);
        expect(parseIncomeArchiveView('active')).toBe(false);
        expect(parseIncomeArchiveView('unexpected')).toBe(false);
    });
});
