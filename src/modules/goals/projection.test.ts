import { describe, expect, it } from 'vitest';
import { projectGoalContributions } from './projection';

describe('financial goal contribution projections', () => {
    it('returns zero months when the target is already reached', () => {
        expect(projectGoalContributions(10000n, 10000n, 0n)).toEqual({ months: 0, reached: true });
    });
    it('uses exact cents and rounds the final partial contribution up to one month', () => {
        expect(projectGoalContributions(10000n, 1000n, 3000n)).toEqual({ months: 3, reached: true });
        expect(projectGoalContributions(10000n, 1000n, 4000n)).toEqual({ months: 3, reached: true });
    });
    it('makes zero contribution an explicit non-reaching scenario', () => {
        expect(projectGoalContributions(10000n, 1000n, 0n)).toEqual({ months: null, reached: false });
    });
    it('rejects negative amounts and invalid goals', () => {
        expect(() => projectGoalContributions(0n, 0n, 100n)).toThrow('Invalid goal projection amounts');
        expect(() => projectGoalContributions(100n, -1n, 10n)).toThrow('Invalid goal projection amounts');
        expect(() => projectGoalContributions(100n, 0n, -1n)).toThrow('Invalid goal projection amounts');
    });
});
