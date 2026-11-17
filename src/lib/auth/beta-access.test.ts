import { describe, expect, it } from 'vitest';
import { canJoinBeta } from './beta-access';

describe('private beta access', () => {
    it('preserves existing behavior when unset', () => {
        expect(canJoinBeta(undefined, undefined, undefined)).toBe(true);
    });
    it('requires a verified listed account when configured', () => {
        expect(canJoinBeta(' Alice@example.com ', 'alice@example.com', true)).toBe(true);
        expect(canJoinBeta('alice@example.com', 'alice@example.com', false)).toBe(false);
        expect(canJoinBeta('alice@example.com', 'bob@example.com', true)).toBe(false);
        expect(canJoinBeta('', 'alice@example.com', true)).toBe(false);
    });
});
