import { beforeEach, describe, expect, it, vi } from 'vitest';
import { listFilteredExpenses, parseExpenseHistoryFilters } from './history';

const findMany = vi.fn();
const database = { expense: { findMany } } as unknown as Parameters<typeof listFilteredExpenses>[0];

describe('expense history filters', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        findMany.mockResolvedValue([]);
    });

    it('validates payment methods and expense types', () => {
        expect(parseExpenseHistoryFilters({
            type: 'FIXED',
            paymentMethod: 'PIX',
            search: '  groceries ',
        })).toEqual({
            type: 'FIXED',
            paymentMethod: 'PIX',
            search: 'groceries',
            cursor: undefined,
            archived: undefined,
        });
        expect(() => parseExpenseHistoryFilters({
            paymentMethod: 'UNKNOWN',
        } as unknown as Parameters<typeof parseExpenseHistoryFilters>[0])).toThrow();
    });

    it('limits the query to the owner and matches descriptions case-insensitively', async () => {
        await listFilteredExpenses(database, 'owner-a', {
            type: 'VARIABLE',
            paymentMethod: 'CREDIT',
            search: 'market',
        });

        expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
            where: {
                userId: 'owner-a',
                archivedAt: null,
                type: 'VARIABLE',
                paymentMethod: 'CREDIT',
                description: { contains: 'market', mode: 'insensitive' },
            },
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            take: 21,
        }));
    });

    it.each(['', '   '])('starts at the first page for a blank cursor %j', async (cursor) => {
        expect(parseExpenseHistoryFilters({ cursor }).cursor).toBeUndefined();

        await listFilteredExpenses(database, 'owner-a', { cursor });

        const query = findMany.mock.calls[0][0];
        expect(query).not.toHaveProperty('cursor');
        expect(query).not.toHaveProperty('skip');
    });

    it('returns twenty records and preserves the last displayed ID as cursor', async () => {
        findMany.mockResolvedValue(
            Array.from({ length: 21 }, (_, index) => ({ id: `expense-${index}` })),
        );

        const result = await listFilteredExpenses(database, 'owner-a', {});

        expect(result.expenses).toHaveLength(20);
        expect(result.nextCursor).toBe('expense-19');

        await listFilteredExpenses(database, 'owner-a', { cursor: result.nextCursor! });
        expect(findMany).toHaveBeenLastCalledWith(expect.objectContaining({
            cursor: { id: 'expense-19' },
            skip: 1,
        }));
    });

    it('blocks anonymous reads', async () => {
        await expect(listFilteredExpenses(database, '', {})).rejects.toThrow();
        expect(findMany).not.toHaveBeenCalled();
    });
});

it('filters persisted occurrences by owner and status before pagination', async () => {
    findMany.mockResolvedValue([]);
    await listFilteredExpenses(database, 'owner-a', { status: 'SETTLED' });
    expect(findMany).toHaveBeenLastCalledWith(expect.objectContaining({
        where: { userId: 'owner-a', archivedAt: null, occurrences: { some: { userId: 'owner-a', status: 'SETTLED' } } },
    }));
});
