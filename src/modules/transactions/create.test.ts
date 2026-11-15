import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createManualTransaction } from './create';

const findCard = vi.fn();
const findCategory = vi.fn();
const findFixedRule = vi.fn();
const create = vi.fn();

const database = {
    creditCard: { findFirst: findCard },
    category: { findFirst: findCategory },
    transaction: { create },
    fixedExpenseRule: { findUnique: findFixedRule },
} as unknown as Parameters<typeof createManualTransaction>[0];

const input = {
    cardId: 'card-a',
    categoryId: 'category-a',
    description: 'Groceries',
    amountInCents: '1250',
    occurredAt: '2026-11-15T12:00:00.000Z',
};

describe('manual transaction creation', () => {
    beforeEach(() => {
        findCard.mockReset().mockResolvedValue({ id: 'card-a' });
        findCategory.mockReset().mockResolvedValue({ id: 'category-a' });
        findFixedRule.mockReset().mockResolvedValue(null);
        create.mockReset().mockResolvedValue({ id: 'transaction-a', amountInCents: BigInt(1250) });
    });

    it('checks ownership and persists a positive integer amount', async () => {
        await createManualTransaction(database, 'owner-a', input);

        expect(findCard).toHaveBeenCalledWith({
            where: { id: 'card-a', userId: 'owner-a' },
            select: { id: true },
        });
        expect(findCategory).toHaveBeenCalledWith({
            where: { id: 'category-a', userId: 'owner-a' },
            select: { id: true },
        });
        expect(create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                userId: 'owner-a',
                cardId: 'card-a',
                categoryId: 'category-a',
                amountInCents: BigInt(1250),
                providerTransactionId: expect.stringMatching(/^manual:/),
            }),
        }));
    });

    it('blocks cards belonging to another user before writing', async () => {
        findCard.mockResolvedValue(null);

        await expect(createManualTransaction(database, 'owner-a', input)).rejects.toThrow(
            'Credit card not found',
        );
        expect(create).not.toHaveBeenCalled();
    });

    it('blocks categories belonging to another user before writing', async () => {
        findCategory.mockResolvedValue(null);

        await expect(createManualTransaction(database, 'owner-a', input)).rejects.toThrow(
            'Category not found',
        );
        expect(create).not.toHaveBeenCalled();
    });

    it.each(['0', '-100', '1.25', 'abc'])('rejects invalid amount %s', async (amountInCents) => {
        await expect(createManualTransaction(database, 'owner-a', {
            ...input,
            amountInCents,
        })).rejects.toThrow();

        expect(create).not.toHaveBeenCalled();
    });

    it('allows transactions without a category', async () => {
        await createManualTransaction(database, 'owner-a', {
            ...input,
            categoryId: null,
        });

        expect(findCategory).not.toHaveBeenCalled();
        expect(create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ categoryId: null }),
        }));
    });
    it('automatically marks a repeated merchant on the same card as fixed', async () => {
        findFixedRule.mockResolvedValue({ id: 'rule-a' });

        await createManualTransaction(database, 'owner-a', {
            ...input,
            description: 'SPOTIFY',
        });

        expect(findFixedRule).toHaveBeenCalledWith({
            where: {
                userId_cardId_merchantKey: {
                    userId: 'owner-a',
                    cardId: 'card-a',
                    merchantKey: 'spotify',
                },
            },
            select: { id: true },
        });
        expect(create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                isFixed: true,
            }),
        }));
    });

    it('keeps unrecognized purchases variable', async () => {
        await createManualTransaction(database, 'owner-a', input);

        expect(create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ isFixed: false }),
        }));
    });

});
