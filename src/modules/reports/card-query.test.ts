import { describe, expect, it } from 'vitest';
import { reportCardWhere } from './card-query';

describe('report card scope', () => {
    it('always scopes selected cards to the authenticated owner', () => {
        expect(reportCardWhere('owner', 'card')).toEqual({ userId: 'owner', cardId: 'card' });
        expect(() => reportCardWhere('', 'card')).toThrow();
        expect(() => reportCardWhere('owner', '')).toThrow();
    });
});
