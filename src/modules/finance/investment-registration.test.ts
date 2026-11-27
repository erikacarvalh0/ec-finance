import { describe, expect, it } from 'vitest';
import { investmentInputSchema } from './validation';

describe('investment registration', () => {
    const valid = { name: 'CDB', type: 'Renda Fixa', amountInCents: '250000', appliedAt: '2026-11-27', maturityAt: '2027-11-27', contractedRate: '120% do CDI' };
    it('accepts metadata and textual contracted rates', () => {
        expect(investmentInputSchema.parse(valid)).toMatchObject(valid);
    });
    it('rejects invalid amounts, missing application dates and earlier maturities', () => {
        expect(investmentInputSchema.safeParse({...valid, amountInCents: '0'}).success).toBe(false);
        expect(investmentInputSchema.safeParse({...valid, appliedAt: undefined}).success).toBe(false);
        expect(investmentInputSchema.safeParse({...valid, maturityAt: '2026-11-26'}).success).toBe(false);
    });
    it('preserves legacy name-only registration', () => {
        expect(investmentInputSchema.parse({name:'Caixinha'})).toEqual({name:'Caixinha'});
    });
});
