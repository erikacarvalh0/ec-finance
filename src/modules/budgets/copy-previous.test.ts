import { beforeEach, describe, expect, it, vi } from 'vitest';
import { copyPreviousMonthBudgets, previousBudgetPeriod } from './copy-previous';

const findMany = vi.fn();
const createMany = vi.fn();
const database = {
    categoryBudget: { findMany, createMany },
} as unknown as Parameters<typeof copyPreviousMonthBudgets>[0];

describe('copying previous monthly budgets', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        findMany.mockResolvedValue([
            { categoryId: 'food', limitInCents: BigInt(50000) },
            { categoryId: 'rent', limitInCents: BigInt(150000) },
        ]);
        createMany.mockResolvedValue({ count: 1 });
    });

    it('calculates the preceding month across year boundaries', () => {
        expect(previousBudgetPeriod('2027-01')).toBe('2026-12');
        expect(previousBudgetPeriod('2027-03')).toBe('2027-02');
    });

    it('copies only owner-scoped limits and skips existing targets', async () => {
        const result = await copyPreviousMonthBudgets(database, 'owner-a', '2027-01');

        expect(findMany).toHaveBeenCalledWith({
            where: { userId: 'owner-a', period: '2026-12' },
            select: { categoryId: true, limitInCents: true },
        });
        expect(createMany).toHaveBeenCalledWith({
            data: [
                { userId: 'owner-a', categoryId: 'food', period: '2027-01', limitInCents: BigInt(50000) },
                { userId: 'owner-a', categoryId: 'rent', period: '2027-01', limitInCents: BigInt(150000) },
            ],
            skipDuplicates: true,
        });
        expect(result).toEqual({ sourcePeriod: '2026-12', targetPeriod: '2027-01', copied: 1, found: 2 });
    });

    it('does not issue a write when no source budgets exist', async () => {
        findMany.mockResolvedValue([]);
        expect(await copyPreviousMonthBudgets(database, 'owner-a', '2027-01'))
            .toEqual({ sourcePeriod: '2026-12', targetPeriod: '2027-01', copied: 0, found: 0 });
        expect(createMany).not.toHaveBeenCalled();
    });

    it('rejects unauthorized owners and invalid dates before reading', async () => {
        await expect(copyPreviousMonthBudgets(database, ' ', '2027-01')).rejects.toThrow();
        await expect(copyPreviousMonthBudgets(database, 'owner-a', '2027-13')).rejects.toThrow();
        expect(findMany).not.toHaveBeenCalled();
    });
});
