import { describe, expect, it, vi } from 'vitest';
import { parseGoalMovement, recordGoalMovement } from './movements';

describe('financial goal movements', () => {
    it('accepts positive cent amounts and a supported type only', () => {
        expect(parseGoalMovement({ type: 'DEPOSIT', amountInCents: '500' }))
            .toEqual({ type: 'DEPOSIT', amountInCents: BigInt(500) });
        expect(parseGoalMovement({ type: 'WITHDRAWAL', amountInCents: '1' }).type)
            .toBe('WITHDRAWAL');
        expect(() => parseGoalMovement({ type: 'DEPOSIT', amountInCents: '0' })).toThrow();
        expect(() => parseGoalMovement({ type: 'DEPOSIT', amountInCents: '-10' })).toThrow();
        expect(() => parseGoalMovement({ type: 'DEPOSIT', amountInCents: '9223372036854775808' })).toThrow();
        expect(() => parseGoalMovement({ type: 'TRANSFER', amountInCents: '1' })).toThrow();
    });

    it('atomically updates owner-scoped balance and records the deposit', async () => {
        const updateMany = vi.fn().mockResolvedValue({ count: 1 });
        const create = vi.fn().mockResolvedValue({ id: 'movement-1' });
        const transaction = vi.fn(async (callback) => callback({
            financialGoal: { updateMany },
            financialGoalMovement: { create },
        }));
        const db = { $transaction: transaction } as unknown as Parameters<typeof recordGoalMovement>[0];

        await recordGoalMovement(db, 'owner-1', 'goal-1', {
            type: 'DEPOSIT', amountInCents: '250',
        });

        expect(updateMany).toHaveBeenCalledWith({
            where: { id: 'goal-1', userId: 'owner-1', savedInCents: { lte: BigInt('9223372036854775557') } },
            data: { savedInCents: { increment: BigInt(250) } },
        });
        expect(create).toHaveBeenCalledWith({ data: {
            userId: 'owner-1', goalId: 'goal-1',
            type: 'DEPOSIT', amountInCents: BigInt(250),
        } });
    });

    it('does not record withdrawals exceeding the available balance', async () => {
        const create = vi.fn();
        const transaction = vi.fn(async (callback) => callback({
            financialGoal: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
            financialGoalMovement: { create },
        }));
        const db = { $transaction: transaction } as unknown as Parameters<typeof recordGoalMovement>[0];
        await expect(recordGoalMovement(db, 'owner-1', 'goal-1', {
            type: 'WITHDRAWAL', amountInCents: '100',
        })).rejects.toThrow('Goal not found or insufficient balance');
        expect(create).not.toHaveBeenCalled();
    });

    it('rejects anonymous access before a transaction', async () => {
        const transaction = vi.fn();
        const db = { $transaction: transaction } as unknown as Parameters<typeof recordGoalMovement>[0];
        await expect(recordGoalMovement(db, '', 'goal-1', {
            type: 'DEPOSIT', amountInCents: '100',
        })).rejects.toThrow();
        expect(transaction).not.toHaveBeenCalled();
    });
});
