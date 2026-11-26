import { beforeEach, describe, expect, it, vi } from 'vitest';
import { listFilteredExpenses, parseExpenseHistoryFilters, matchesDueMonth } from './history';

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

const month = new Date('2026-11-01T00:00:00Z');
const expense = {
    id: 'expense-a', description: 'Compra', amountInCents: BigInt(3000),
    date: new Date('2026-09-30T00:00:00Z'), createdAt: month,
    installments: 3, type: 'VARIABLE' as const, paymentMethod: 'CREDIT',
    occurrences: [],
};

it('includes implicit pending installments in their due month', () => {
    expect(matchesDueMonth(expense, month, 'PENDING')).toBe(true);
    expect(matchesDueMonth(expense, new Date('2026-12-01T00:00:00Z'), 'PENDING')).toBe(false);
});

it('matches status only for the selected due month', () => {
    const paid = { ...expense, occurrences: [{ dueMonth: month, status: 'SETTLED' }] };
    expect(matchesDueMonth(paid, month, 'PENDING')).toBe(false);
    expect(matchesDueMonth(paid, month, 'SETTLED')).toBe(true);
    expect(matchesDueMonth(paid, new Date('2026-10-01T00:00:00Z'), 'PENDING')).toBe(true);
});

it('honors recurrence end dates', () => {
    expect(matchesDueMonth({ ...expense, installments: 1, type: 'FIXED', endsOn: new Date('2026-10-01T00:00:00Z') }, month)).toBe(false);
});

it('filters scheduled occurrences before pagination', async () => {
    findMany.mockResolvedValueOnce([expense, { ...expense, id: 'outside', installments: 1 }]);
    const result = await listFilteredExpenses(database, 'owner-a', { month: '2026-11', status: 'PENDING', categoryId: 'category-a' });
    expect(result.expenses.map(row => row.id)).toEqual(['expense-a']);
    expect(findMany).toHaveBeenLastCalledWith(expect.objectContaining({
        where: expect.objectContaining({ userId: 'owner-a', categoryId: 'category-a' }),
        include: { occurrences: { where: { userId: 'owner-a', dueMonth: month } } },
    }));
});
