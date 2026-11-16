import { beforeEach, describe, expect, it, vi } from 'vitest';
import { endOwnedRecurrence } from './end-recurrence';

const expenseFind = vi.fn();
const expenseUpdate = vi.fn();
const incomeFind = vi.fn();
const incomeUpdate = vi.fn();

const database = {
    expense: { findFirst: expenseFind, update: expenseUpdate },
    income: { findFirst: incomeFind, update: incomeUpdate },
} as unknown as Parameters<typeof endOwnedRecurrence>[0];

describe('ending existing recurring sources', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        expenseFind.mockResolvedValue({
            id: 'expense-a',
            type: 'FIXED',
            installments: 1,
            date: new Date('2026-10-10T00:00:00.000Z'),
            createdAt: new Date('2026-10-10T00:00:00.000Z'),
        });
        incomeFind.mockResolvedValue({
            id: 'income-a',
            type: 'RECURRING',
            date: new Date('2026-10-10T00:00:00.000Z'),
        });
    });

    it('ends an owned fixed expense without modifying settled occurrences', async () => {
        await endOwnedRecurrence(database, 'owner-a', 'expense', 'expense-a', '2026-11-30');

        expect(expenseFind).toHaveBeenCalledWith({
            where: { id: 'expense-a', userId: 'owner-a' },
            select: expect.any(Object),
        });
        expect(expenseUpdate).toHaveBeenCalledWith({
            where: { id: 'expense-a', userId: 'owner-a' },
            data: { endsOn: new Date('2026-11-30T00:00:00.000Z') },
        });
    });

    it('ends recurring income for its original owner', async () => {
        await endOwnedRecurrence(database, 'owner-a', 'income', 'income-a', '2026-12-01');

        expect(incomeUpdate).toHaveBeenCalledWith({
            where: { id: 'income-a', userId: 'owner-a' },
            data: { endsOn: new Date('2026-12-01T00:00:00.000Z') },
        });
    });

    it('rejects cross-user and non-recurring updates', async () => {
        incomeFind.mockResolvedValue(null);

        await expect(endOwnedRecurrence(
            database, 'owner-a', 'income', 'private', '2026-12-01',
        )).rejects.toThrow('Record not found');

        expenseFind.mockResolvedValue({
            type: 'VARIABLE', installments: 1, date: null, createdAt: new Date(),
        });
        await expect(endOwnedRecurrence(
            database, 'owner-a', 'expense', 'expense-a', '2026-12-01',
        )).rejects.toThrow('Not a recurring record');
        expect(expenseUpdate).not.toHaveBeenCalled();
    });

    it('rejects end dates earlier than recurrence start', async () => {
        await expect(endOwnedRecurrence(
            database, 'owner-a', 'income', 'income-a', '2026-09-01',
        )).rejects.toThrow('End date precedes start date');

        expect(incomeUpdate).not.toHaveBeenCalled();
    });
});
