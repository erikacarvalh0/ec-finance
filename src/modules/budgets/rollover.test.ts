import { describe, expect, it, vi } from 'vitest';
import { applyBudgetRollover } from './rollover';

function setup(previousLimit = BigInt(10000), spent = BigInt(6000)) {
    let applied = false;
    const updateMany = vi.fn(async () => {
        if (applied) return { count: 0 };
        applied = true;
        return { count: 1 };
    });
    const database = {
        category: { findMany: vi.fn().mockResolvedValue([{ id: 'food', name: 'Food' }]) },
        categoryBudget: {
            findFirst: vi.fn().mockResolvedValue({ id: 'target' }),
            findMany: vi.fn().mockResolvedValue([{ categoryId: 'food', limitInCents: previousLimit }]),
            updateMany,
        },
        expense: { findMany: vi.fn().mockResolvedValue([{ id: 'e', categoryId: 'food', amountInCents: spent, linkedTransactionId: null }]) },
        transaction: { findMany: vi.fn().mockResolvedValue([]) },
    };
    return { database: database as unknown as Parameters<typeof applyBudgetRollover>[0], updateMany };
}
const input = { categoryId: 'food', period: '2027-01', capInCents: '3000' };

describe('persisted budget rollover', () => {
    it('caps eligible balance and guards repeated or concurrent applications atomically', async () => {
        const { database, updateMany } = setup();
        const results = await Promise.all([
            applyBudgetRollover(database, 'owner', input),
            applyBudgetRollover(database, 'owner', input),
        ]);
        expect(results.map(result => result.applied)).toEqual([true, false]);
        expect(updateMany).toHaveBeenCalledWith({
            where: { userId: 'owner', categoryId: 'food', period: '2027-01', rolloverAppliedAt: null },
            data: { rolloverInCents: BigInt(3000), rolloverCapInCents: BigInt(3000), rolloverAppliedAt: expect.any(Date) },
        });
        expect(database.categoryBudget.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'owner', period: '2026-12' } }));
    });

    it('transfers only the eligible balance when it is below the cap', async () => {
        const { database, updateMany } = setup(BigInt(7000), BigInt(6000));
        await applyBudgetRollover(database, 'owner', input);
        expect(updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ rolloverInCents: BigInt(1000) }) }));
    });

    it('does not carry debt and records zero to prevent later reapplication', async () => {
        const { database, updateMany } = setup(BigInt(1000), BigInt(2000));
        await applyBudgetRollover(database, 'owner', input);
        expect(updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ rolloverInCents: BigInt(0) }) }));
    });

    it('transfers zero when the source month has no budget', async () => {
        const { database, updateMany } = setup();
        vi.mocked(database.categoryBudget.findMany).mockResolvedValueOnce([]);
        await applyBudgetRollover(database, 'owner', input);
        expect(updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ rolloverInCents: BigInt(0) }) }));
    });

    it('requires an owned target budget and valid configuration before writing', async () => {
        const { database, updateMany } = setup();
        for (const capInCents of ['-1', '0', '1.5', '9223372036854775808']) {
            await expect(applyBudgetRollover(database, 'owner', { ...input, capInCents })).rejects.toThrow();
        }
        await expect(applyBudgetRollover(database, '', input)).rejects.toThrow();
        vi.mocked(database.categoryBudget.findFirst).mockResolvedValueOnce(null);
        await expect(applyBudgetRollover(database, 'other', input)).rejects.toThrow('Budget not found');
        expect(updateMany).not.toHaveBeenCalled();
    });
});
