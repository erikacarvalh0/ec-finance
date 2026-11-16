import { beforeEach, describe, expect, it, vi } from 'vitest';
import { calculateCardLimit, configureCardLimit, getCardLimitOverview } from './limits';

const cardFind = vi.fn();
const cardUpdate = vi.fn();
const transactionFind = vi.fn();
const expenseFind = vi.fn();
const db = {
    creditCard: { findFirst: cardFind, update: cardUpdate },
    transaction: { findMany: transactionFind },
    expense: { findMany: expenseFind },
} as unknown as Parameters<typeof configureCardLimit>[0];

describe('card spending limit', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        cardFind.mockResolvedValue({ id: 'card-a', creditLimitInCents: BigInt(200000) });
        transactionFind.mockResolvedValue([]);
        expenseFind.mockResolvedValue([]);
    });

    it('tracks estimated amount used and available without treating it as bank balance', () => {
        expect(calculateCardLimit(BigInt(100000), BigInt(70000))).toEqual({
            creditLimitInCents: BigInt(100000),
            estimatedUsedInCents: BigInt(70000),
            estimatedAvailableInCents: BigInt(30000),
            utilizationPercentage: 70,
        });
        expect(calculateCardLimit(BigInt(100000), BigInt(120000)).estimatedAvailableInCents)
            .toBe(BigInt(-20000));
    });

    it('does not double count manually entered expenses explicitly linked to card transactions', () => {
        const result = calculateCardLimit(BigInt(100000), BigInt(0), [
            { amountInCents: BigInt(30000), linkedTransactionId: null },
            { amountInCents: BigInt(12000), linkedTransactionId: 'imported-a' },
        ], [{ id: 'imported-a', amountInCents: BigInt(12000) }]);
        expect(result.estimatedUsedInCents).toBe(BigInt(42000));
    });

    it('updates only a card owned by the authenticated user', async () => {
        await configureCardLimit(db, 'owner-a', 'card-a', { creditLimitInCents: '350000' });
        expect(cardUpdate).toHaveBeenCalledWith({
            where: { id: 'card-a', userId: 'owner-a' },
            data: { creditLimitInCents: BigInt(350000) },
        });
    });

    it('rejects invalid limits, negative cents, and foreign cards', async () => {
        await expect(configureCardLimit(db, 'owner-a', 'card-a', {
            creditLimitInCents: '-100',
        })).rejects.toThrow();
        cardFind.mockResolvedValue(null);
        await expect(configureCardLimit(db, 'owner-a', 'private', {
            creditLimitInCents: '5000',
        })).rejects.toThrow('Card not found');
        expect(cardUpdate).not.toHaveBeenCalled();
    });

    it('only reads card transactions and credit expenses scoped by owner and card', async () => {
        await getCardLimitOverview(db, 'owner-a', 'card-a');
        expect(transactionFind).toHaveBeenCalledWith(expect.objectContaining({
            where: expect.objectContaining({ userId: 'owner-a', cardId: 'card-a' }),
        }));
        expect(expenseFind).toHaveBeenCalledWith(expect.objectContaining({
            where: expect.objectContaining({ userId: 'owner-a', cardId: 'card-a', paymentMethod: 'CREDIT' }),
        }));
    });
});
