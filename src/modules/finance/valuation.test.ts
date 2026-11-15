import { describe, expect, it } from 'vitest';
import { calculateValuationChange } from './valuation';

describe('investment valuation history', () => {
    it('shows increases, decreases and unchanged balances', () => {
        expect(calculateValuationChange('12000', '10000')).toBe(2000);
        expect(calculateValuationChange('8000', '10000')).toBe(-2000);
        expect(calculateValuationChange('10000', '10000')).toBe(0);
    });
});
