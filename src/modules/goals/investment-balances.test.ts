import { describe, expect, it } from 'vitest';
import { calculateLinkedGoalSavings } from './investment-balances';

describe('linked goal savings', () => {
    it('excludes unauthorized balances and counts each investment once', () => {
        const a = { investmentId: 'a', authorized: true, allocatedInCents: BigInt(200) };
        expect(calculateLinkedGoalSavings(BigInt(100), [a, a,
            { investmentId: 'b', authorized: false, allocatedInCents: BigInt(500) },
        ])).toBe(BigInt(300));
    });
});
