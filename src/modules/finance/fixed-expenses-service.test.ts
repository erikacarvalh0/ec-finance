import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    classifyImportedCardTransaction,
    markCardTransactionFixed,
} from './fixed-expenses-service';

const findTransaction = vi.fn();
const updateTransaction = vi.fn();
const upsertRule = vi.fn();
const findRule = vi.fn();

const database = {
    transaction: {
        findFirst: findTransaction,
        update: updateTransaction,
    },
    fixedExpenseRule: {
        upsert: upsertRule,
        findUnique: findRule,
    },
} as unknown as Parameters<typeof markCardTransactionFixed>[0];

describe('fixed credit-card expense rules', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('creates an owner-card-specific rule when explicitly marked fixed', async () => {
        findTransaction.mockResolvedValue({
            cardId: 'card-a',
            description: 'Spotify',
        });

        await markCardTransactionFixed(database, 'owner-a', 'transaction-a');

        expect(findTransaction).toHaveBeenCalledWith({
            where: { id: 'transaction-a', userId: 'owner-a' },
            select: { cardId: true, description: true },
        });
        expect(upsertRule).toHaveBeenCalledWith({
            where: {
                userId_cardId_merchantKey: {
                    userId: 'owner-a',
                    cardId: 'card-a',
                    merchantKey: 'spotify',
                },
            },
            create: {
                userId: 'owner-a',
                cardId: 'card-a',
                merchantKey: 'spotify',
            },
            update: {},
        });
        expect(updateTransaction).toHaveBeenCalledWith({
            where: { id: 'transaction-a', userId: 'owner-a' },
            data: { isFixed: true },
        });
    });

    it('prevents creating a fixed rule for another user transaction', async () => {
        findTransaction.mockResolvedValue(null);

        await expect(markCardTransactionFixed(
            database,
            'owner-a',
            'transaction-b',
        )).rejects.toThrow('Transaction not found');

        expect(upsertRule).not.toHaveBeenCalled();
    });

    it('auto-recognizes a later imported purchase with the same owner and card', async () => {
        findRule.mockResolvedValue({ id: 'rule-a' });

        const fixed = await classifyImportedCardTransaction(database, {
            userId: 'owner-a',
            cardId: 'card-a',
            description: ' SPOTIFY ',
        });

        expect(fixed).toBe(true);
        expect(findRule).toHaveBeenCalledWith({
            where: {
                userId_cardId_merchantKey: {
                    userId: 'owner-a',
                    cardId: 'card-a',
                    merchantKey: 'spotify',
                },
            },
            select: { id: true },
        });
    });

    it('does not auto-mark purchases without a matching rule', async () => {
        findRule.mockResolvedValue(null);

        expect(await classifyImportedCardTransaction(database, {
            userId: 'owner-b',
            cardId: 'card-a',
            description: 'Spotify',
        })).toBe(false);
    });
});
