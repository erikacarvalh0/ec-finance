import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { getIncomeSummary, summarizeIncomes } from './summary';

const now = new Date('2026-01-15T12:00:00Z');
const entry = (amount: number, date: string | null, created = '2026-01-01') => ({
    amountInCents: BigInt(amount), date: date ? new Date(date) : null, createdAt: new Date(created),
});

describe('income summary', () => {
    it('uses recorded dates, includes zero months and crosses year boundaries', () => {
        expect(summarizeIncomes([
            entry(12000, '2026-01-01'), entry(6000, null), entry(9000, '2025-12-31'),
            entry(1000, '2025-07-31'), entry(1000, '2026-02-01'),
        ], now)).toEqual({ total: BigInt(18000), average: BigInt(4500), variation: 100, count: 2 });
    });

    it('handles empty periods and negative variation', () => {
        expect(summarizeIncomes([], now)).toEqual({ total: BigInt(0), average: BigInt(0), variation: null, count: 0 });
        expect(summarizeIncomes([entry(100, '2025-12-01')], now).variation).toBe(-100);
    });

    it('queries the authenticated owner without history pagination', async () => {
        const findMany = vi.fn().mockResolvedValue(Array.from({ length: 25 }, () => entry(100, null)));
        const database = { income: { findMany } } as unknown as Pick<PrismaClient, 'income'>;
        expect((await getIncomeSummary(database, 'owner', now)).count).toBe(25);
        expect(findMany).toHaveBeenCalledWith({
            where: { userId: 'owner', OR: [
                { date: { gte: new Date('2025-08-01'), lt: new Date('2026-02-01') } },
                { date: null, createdAt: { gte: new Date('2025-08-01'), lt: new Date('2026-02-01') } },
            ] },
            select: { amountInCents: true, date: true, createdAt: true },
        });
        await expect(getIncomeSummary(database, '', now)).rejects.toThrow();
    });
});
