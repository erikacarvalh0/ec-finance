import { beforeEach, describe, expect, it, vi } from 'vitest';
import { updateForecastOccurrence } from './occurrences';

const findExpense = vi.fn();
const findIncome = vi.fn();
const upsertExpense = vi.fn();
const upsertIncome = vi.fn();

const database = {
    expense: { findFirst: findExpense },
    income: { findFirst: findIncome },
    expenseOccurrence: { upsert: upsertExpense },
    incomeOccurrence: { upsert: upsertIncome },
} as unknown as Parameters<typeof updateForecastOccurrence>[0];

const record = {
    id: 'expense-a',
    userId: 'owner-a',
    description: 'Phone',
    amountInCents: BigInt(9000),
    installments: 3,
    type: 'VARIABLE',
    paymentMethod: 'CREDIT',
    date: new Date('2027-01-05T00:00:00.000Z'),
    createdAt: new Date('2027-01-05T00:00:00.000Z'),
};

describe('forecast occurrence mutations', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        findExpense.mockResolvedValue(record);
        findIncome.mockResolvedValue({
            id: 'income-a',
            userId: 'owner-a',
            type: 'RECURRING',
            amountInCents: BigInt(15000),
            date: new Date('2027-01-10T00:00:00.000Z'),
            createdAt: new Date('2027-01-10T00:00:00.000Z'),
            description: 'Rent',
        });
    });

    it('marks a single installment settled with a corrected amount', async () => {
        await updateForecastOccurrence(
            database,
            'owner-a',
            'expense',
            'expense-a',
            {
                month: '2027-02',
                status: 'SETTLED',
                actualAmountInCents: '2900',
            },
        );

        expect(findExpense).toHaveBeenCalledWith({
            where: { id: 'expense-a', userId: 'owner-a' },
        });
        expect(upsertExpense).toHaveBeenCalledWith(expect.objectContaining({
            where: {
                expenseId_dueMonth: {
                    expenseId: 'expense-a',
                    dueMonth: new Date('2027-02-01T00:00:00.000Z'),
                },
            },
            create: expect.objectContaining({
                userId: 'owner-a',
                status: 'SETTLED',
                actualAmountInCents: BigInt(2900),
            }),
        }));
    });

    it('rejects an unrelated tenant source without writing', async () => {
        findExpense.mockResolvedValue(null);

        await expect(updateForecastOccurrence(database, 'owner-a', 'expense', 'private', {
            month: '2027-02',
            status: 'CANCELED',
        })).rejects.toThrow('Forecast source not found');

        expect(upsertExpense).not.toHaveBeenCalled();
    });

    it('rejects months outside the installment schedule', async () => {
        await expect(updateForecastOccurrence(database, 'owner-a', 'expense', 'expense-a', {
            month: '2027-05',
            status: 'SETTLED',
        })).rejects.toThrow('Forecast occurrence not found');

        expect(upsertExpense).not.toHaveBeenCalled();
    });

    it('does not allow canceled occurrences to carry a paid amount', async () => {
        await expect(updateForecastOccurrence(database, 'owner-a', 'expense', 'expense-a', {
            month: '2027-02',
            status: 'CANCELED',
            actualAmountInCents: '9000',
        })).rejects.toThrow();

        expect(upsertExpense).not.toHaveBeenCalled();
    });

    it('allows clearing a paid occurrence back to pending', async () => {
        await updateForecastOccurrence(database, 'owner-a', 'income', 'income-a', {
            month: '2027-03',
            status: 'PENDING',
        });

        expect(upsertIncome).toHaveBeenCalledWith(expect.objectContaining({
            create: expect.objectContaining({
                status: 'PENDING',
                actualAmountInCents: null,
                settledAt: null,
            }),
        }));
    });

    it('rejects invalid dates and negative actual amounts', async () => {
        await expect(updateForecastOccurrence(database, 'owner-a', 'income', 'income-a', {
            month: '2027-13',
            status: 'SETTLED',
        })).rejects.toThrow();

        await expect(updateForecastOccurrence(database, 'owner-a', 'income', 'income-a', {
            month: '2027-02',
            status: 'SETTLED',
            actualAmountInCents: '-10',
        })).rejects.toThrow();

        expect(upsertIncome).not.toHaveBeenCalled();
    });
});
