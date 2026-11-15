import { describe, expect, it, vi } from 'vitest';
import { getUserCashflowForecast } from './repository';

describe('forecast repository', () => {
    const start = new Date('2026-11-15T00:00:00.000Z');

    it('queries only the authenticated owner and projects their data', async () => {
        const expenseFindMany = vi.fn().mockResolvedValue([{
            id: 'expense-a',
            description: 'Phone',
            amountInCents: BigInt(10000),
            date: start,
            createdAt: start,
            installments: 2,
            type: 'VARIABLE',
            paymentMethod: 'CREDIT',
        }]);
        const incomeFindMany = vi.fn().mockResolvedValue([]);
        const database = {
            expense: { findMany: expenseFindMany },
            income: { findMany: incomeFindMany },
        } as unknown as Parameters<typeof getUserCashflowForecast>[0];

        const result = await getUserCashflowForecast(database, 'owner-a', start, 2);

        expect(expenseFindMany).toHaveBeenCalledWith(expect.objectContaining({
            where: expect.objectContaining({ userId: 'owner-a' }),
        }));
        expect(incomeFindMany).toHaveBeenCalledWith(expect.objectContaining({
            where: expect.objectContaining({ userId: 'owner-a' }),
        }));
        expect(result.map((month) => month.expenseTotalInCents))
            .toEqual([BigInt(5000), BigInt(5000)]);
    });

    it('rejects unauthenticated requests before database queries', async () => {
        const expenseFindMany = vi.fn();
        const incomeFindMany = vi.fn();
        const database = {
            expense: { findMany: expenseFindMany },
            income: { findMany: incomeFindMany },
        } as unknown as Parameters<typeof getUserCashflowForecast>[0];

        await expect(getUserCashflowForecast(database, ' ', start, 6))
            .rejects.toThrow('Authenticated user ID is required');

        expect(expenseFindMany).not.toHaveBeenCalled();
        expect(incomeFindMany).not.toHaveBeenCalled();
    });

    it('rejects invalid month windows before database queries', async () => {
        const expenseFindMany = vi.fn();
        const database = {
            expense: { findMany: expenseFindMany },
            income: { findMany: vi.fn() },
        } as unknown as Parameters<typeof getUserCashflowForecast>[0];

        await expect(getUserCashflowForecast(database, 'owner-a', start, 25))
            .rejects.toThrow('Invalid forecast window');

        expect(expenseFindMany).not.toHaveBeenCalled();
    });
});
