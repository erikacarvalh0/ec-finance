import { beforeEach, describe, expect, it, vi } from 'vitest';
import { updateOwnedExpense, updateOwnedIncome } from './edit-record';

const expenseFind = vi.fn();
const expenseUpdate = vi.fn();
const expenseSettled = vi.fn();
const incomeFind = vi.fn();
const incomeUpdate = vi.fn();
const incomeSettled = vi.fn();

const database = {
    expense: { findFirst: expenseFind, update: expenseUpdate },
    income: { findFirst: incomeFind, update: incomeUpdate },
    expenseOccurrence: { count: expenseSettled },
    incomeOccurrence: { count: incomeSettled },
} as unknown as Parameters<typeof updateOwnedExpense>[0];

describe('editing owned finance records', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        expenseFind.mockResolvedValue({ id: 'expense-a', type: 'FIXED', installments: 1 });
        incomeFind.mockResolvedValue({ id: 'income-a', type: 'RECURRING' });
        expenseSettled.mockResolvedValue(0);
        incomeSettled.mockResolvedValue(0);
    });

    it('updates an owned expense using only validated fields', async () => {
        await updateOwnedExpense(database, 'owner-a', 'expense-a', {
            description: 'New internet bill',
            amountInCents: '15500',
            paymentMethod: 'PIX',
            type: 'FIXED',
            date: '2026-11-15',
            installments: 1,
            endsOn: '2027-02-15',
        });

        expect(expenseFind).toHaveBeenCalledWith({
            where: { id: 'expense-a', userId: 'owner-a' },
            select: { id: true, type: true, installments: true },
        });
        expect(expenseUpdate).toHaveBeenCalledWith(expect.objectContaining({
            where: { id: 'expense-a', userId: 'owner-a' },
            data: expect.objectContaining({
                description: 'New internet bill',
                amountInCents: BigInt(15500),
                endsOn: new Date('2027-02-15T00:00:00.000Z'),
            }),
        }));
    });

    it('prevents cross-tenant edits', async () => {
        expenseFind.mockResolvedValue(null);

        await expect(updateOwnedExpense(database, 'owner-a', 'private', {
            description: 'Hidden', amountInCents: '100', type: 'VARIABLE',
            paymentMethod: 'PIX', installments: 1,
        })).rejects.toThrow('Record not found');

        expect(expenseUpdate).not.toHaveBeenCalled();
    });

    it('prevents changing a source with already settled occurrences', async () => {
        expenseSettled.mockResolvedValue(1);
        await expect(updateOwnedExpense(database, 'owner-a', 'expense-a', {
            description: 'Changed', amountInCents: '100', type: 'VARIABLE',
            paymentMethod: 'PIX', installments: 1,
        })).rejects.toThrow('Settled occurrences prevent editing');
        expect(expenseUpdate).not.toHaveBeenCalled();
    });

    it('allows ending recurring income while preserving its original start date', async () => {
        await updateOwnedIncome(database, 'owner-a', 'income-a', {
            type: 'RECURRING',
            amountInCents: '25000',
            responsible: 'Tenant',
            description: 'Monthly rent',
            date: '2026-11-10',
            endsOn: '2027-01-10',
        });
        expect(incomeUpdate).toHaveBeenCalledWith(expect.objectContaining({
            where: { id: 'income-a', userId: 'owner-a' },
            data: expect.objectContaining({
                endsOn: new Date('2027-01-10T00:00:00.000Z'),
            }),
        }));
    });

    it('rejects recurrence end dates before the first date', async () => {
        await expect(updateOwnedIncome(database, 'owner-a', 'income-a', {
            type: 'RECURRING', amountInCents: '25000',
            responsible: 'Tenant', description: 'Rent',
            date: '2026-11-10', endsOn: '2026-10-10',
        })).rejects.toThrow();
        expect(incomeUpdate).not.toHaveBeenCalled();
    });
});
