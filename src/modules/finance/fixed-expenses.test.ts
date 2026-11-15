import { describe, expect, it } from 'vitest';
import { normalizeMerchant, classifyFixedExpense } from './fixed-expenses';

describe('fixed credit card expense classification', () => {
    it('matches only the same user, card and normalized merchant', () => {
        const rule = {
            userId: 'owner-a',
            cardId: 'card-a',
            merchantKey: 'spotify',
        };

        expect(classifyFixedExpense({
            userId: 'owner-a',
            cardId: 'card-a',
            description: ' SPOTIFY  ',
        }, [rule])).toBe(true);

        expect(classifyFixedExpense({
            userId: 'owner-b',
            cardId: 'card-a',
            description: 'Spotify',
        }, [rule])).toBe(false);

        expect(classifyFixedExpense({
            userId: 'owner-a',
            cardId: 'card-b',
            description: 'Spotify',
        }, [rule])).toBe(false);
    });

    it('ignores punctuation and repeated spaces without using substring matches', () => {
        expect(normalizeMerchant('  NETFLIX.com  ')).toBe('netflix com');

        expect(classifyFixedExpense({
            userId: 'owner-a',
            cardId: 'card-a',
            description: 'Netflix premium',
        }, [{
            userId: 'owner-a',
            cardId: 'card-a',
            merchantKey: 'netflix',
        }])).toBe(false);
    });

    it('does not classify transactions with no explicit fixed rule', () => {
        expect(classifyFixedExpense({
            userId: 'owner-a',
            cardId: 'card-a',
            description: 'Spotify',
        }, [])).toBe(false);
    });
});
