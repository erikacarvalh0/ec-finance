import { describe, expect, it } from 'vitest';
import { projectGoalContributions } from './projection';

describe('financial goal contribution projections', () => {
    it('returns zero months when the target is already reached', () => {
        expect(projectGoalContributions(BigInt(10000), BigInt(10000), BigInt(0))).toEqual({ months: 0, reached: true });
    });
    it('uses exact cents and rounds the final partial contribution up to one month', () => {
        expect(projectGoalContributions(BigInt(10000), BigInt(1000), BigInt(3000))).toEqual({ months: 3, reached: true });
        expect(projectGoalContributions(BigInt(10000), BigInt(1000), BigInt(4000))).toEqual({ months: 3, reached: true });
    });
    it('makes zero contribution an explicit non-reaching scenario', () => {
        expect(projectGoalContributions(BigInt(10000), BigInt(1000), BigInt(0))).toEqual({ months: null, reached: false });
    });
    it('rejects negative amounts and invalid goals', () => {
        expect(() => projectGoalContributions(BigInt(0), BigInt(0), BigInt(100))).toThrow('Invalid goal projection amounts');
        expect(() => projectGoalContributions(BigInt(100), BigInt(-1), BigInt(10))).toThrow('Invalid goal projection amounts');
        expect(() => projectGoalContributions(BigInt(100), BigInt(0), BigInt(-1))).toThrow('Invalid goal projection amounts');
    });
});
