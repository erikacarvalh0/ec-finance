import { describe, expect, it, vi } from 'vitest';
import { getMonthlyFixedExpenses } from './monthly';

describe('monthly fixed expenses', () => {
    it('only counts fixed expenses in the selected month and user', async () => {
        const expenseFind = vi.fn().mockResolvedValue([{
            id: 'expense-a',
            description: 'Rent',
            amountInCents: BigInt(90000),
            date: new Date('2026-11-05T00:00:00.000Z'),
        }]);
        const transactionFind = vi.fn().mockResolvedValue([{
            id: 'card-a',
            description: 'Spotify',
            amountInCents: BigInt(3000),
            occurredAt: new Date('2026-11-10T00:00:00.000Z'),
        }]);
        const database = {
            expense: { findMany: expenseFind },
            transaction: { findMany: transactionFind },
        } as unknown as Parameters<typeof getMonthlyFixedExpenses>[0];

        const result = await getMonthlyFixedExpenses(database, 'owner-a', 2026, 11);

        expect(result.totalInCents).toBe(BigInt(93000));
        expect(expenseFind).toHaveBeenCalledWith(expect.objectContaining({
            where: expect.objectContaining({
                userId: 'owner-a',
                type: 'FIXED',
            }),
        }));
        expect(transactionFind).toHaveBeenCalledWith(expect.objectContaining({
            where: expect.objectContaining({
                userId: 'owner-a',
                isFixed: true,
            }),
        }));
    });

    it('rejects invalid month and missing owner', async () => {
        const database = {
            expense: { findMany: vi.fn() },
            transaction: { findMany: vi.fn() },
        } as unknown as Parameters<typeof getMonthlyFixedExpenses>[0];

        await expect(getMonthlyFixedExpenses(database, '', 2026, 11)).rejects.toThrow();
        await expect(getMonthlyFixedExpenses(database, 'owner-a', 2026, 13)).rejects.toThrow();
    });
});
