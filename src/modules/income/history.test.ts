import { beforeEach, describe, expect, it, vi } from 'vitest';
import { listFilteredIncomes, parseIncomeHistoryFilters } from './history';

const findMany = vi.fn();
const db = {
    income: { findMany },
} as unknown as Parameters<typeof listFilteredIncomes>[0];

describe('income history filters and pagination', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        findMany.mockResolvedValue([]);
    });

    it('only accepts supported income types and short search queries', () => {
        expect(parseIncomeHistoryFilters({ type: 'SALARY', search: '  salary  ' }))
            .toEqual({ type: 'SALARY', search: 'salary', cursor: undefined });
        expect(() => parseIncomeHistoryFilters({ type: 'INVALID' } as unknown as Parameters<typeof parseIncomeHistoryFilters>[0])).toThrow();
        expect(() => parseIncomeHistoryFilters({ search: 'x'.repeat(101) })).toThrow();
    });

    it('queries only the authenticated owner and filters by income type and name', async () => {
        await listFilteredIncomes(db, 'owner-a', {
            type: 'RECURRING', search: 'rent',
        });

        expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
            where: {
                userId: 'owner-a',
                type: 'RECURRING',
                OR: [
                    { description: { contains: 'rent', mode: 'insensitive' } },
                    { responsible: { contains: 'rent', mode: 'insensitive' } },
                ],
            },
            take: 21,
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        }));
    });

    it('returns a stable cursor without losing entries across pages', async () => {
        findMany.mockResolvedValue(
            Array.from({ length: 21 }, (_, i) => ({
                id: `income-${i}`,
                amountInCents: BigInt(100),
            })),
        );

        const result = await listFilteredIncomes(db, 'owner-a', {});
        expect(result.incomes).toHaveLength(20);
        expect(result.nextCursor).toBe('income-19');

        await listFilteredIncomes(db, 'owner-a', { cursor: 'income-19' });

        expect(findMany).toHaveBeenLastCalledWith(expect.objectContaining({
            cursor: { id: 'income-19' },
            skip: 1,
        }));
    });

    it('rejects anonymous access before database reads', async () => {
        await expect(listFilteredIncomes(db, ' ', {})).rejects.toThrow();
        expect(findMany).not.toHaveBeenCalled();
    });
});
