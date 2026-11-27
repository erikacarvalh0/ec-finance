import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { getIncomeCharts, summarizeIncomeCharts } from './charts';

const now = new Date('2026-01-15T12:00:00Z');
describe('income charts', () => {
    it('groups six months and distributes only the current month', () => {
        const data = summarizeIncomeCharts([
            { amountInCents: BigInt(100), date: new Date('2025-12-01'), createdAt: now, type: 'SALARY' },
            { amountInCents: BigInt(300), date: null, createdAt: now, type: 'OTHER' },
            { amountInCents: BigInt(700), date: now, createdAt: now, type: 'RECURRING' },
        ], now);
        expect(data.months.map(month => Number(month.cents))).toEqual([0, 0, 0, 0, 100, 1000]);
        expect(data.types.map(type => Number(type.cents))).toEqual([0, 700, 300]);
        expect(data.total).toBe(BigInt(1000));
    });

    it('handles empty periods', () => {
        expect(summarizeIncomeCharts([], now).total).toBe(BigInt(0));
    });

    it('queries only the authenticated owner without pagination', async () => {
        const findMany = vi.fn().mockResolvedValue([]);
        const database = { income: { findMany } } as unknown as Pick<PrismaClient, 'income'>;
        await getIncomeCharts(database, 'owner', now);
        expect(findMany).toHaveBeenCalledWith({
            where: { userId: 'owner', OR: [
                { date: { gte: new Date('2025-08-01'), lt: new Date('2026-02-01') } },
                { date: null, createdAt: { gte: new Date('2025-08-01'), lt: new Date('2026-02-01') } },
            ] },
            select: { amountInCents: true, date: true, createdAt: true, type: true },
        });
        await expect(getIncomeCharts(database, '', now)).rejects.toThrow();
    });
});
