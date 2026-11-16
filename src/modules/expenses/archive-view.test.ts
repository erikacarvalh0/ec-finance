import { describe, expect, it } from 'vitest';
import { parseExpenseArchiveView } from './archive-view';

describe('expenses archived history selection', () => {
    it('defaults to active records', () => {
        expect(parseExpenseArchiveView(undefined)).toBe(false);
        expect(parseExpenseArchiveView('')).toBe(false);
    });

    it('selects archived records only for the explicit archived value', () => {
        expect(parseExpenseArchiveView('archived')).toBe(true);
        expect(parseExpenseArchiveView('active')).toBe(false);
        expect(parseExpenseArchiveView('unexpected')).toBe(false);
    });
});
