import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createExpense, createIncome, addInvestmentSnapshot } from './service';

const expenseCreate = vi.fn();
const incomeCreate = vi.fn();
const investmentFind = vi.fn();
const snapshotCreate = vi.fn();

const database = {
    expense: { create: expenseCreate },
    income: { create: incomeCreate },
    investment: { findFirst: investmentFind },
    investmentSnapshot: { create: snapshotCreate },
} as unknown as Parameters<typeof createExpense>[0];

describe('finance records ownership', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('persists an expense under the authenticated owner', async () => {
        await createExpense(database, 'owner-a', {
            description: 'Groceries',
            amountInCents: '1090',
            paymentMethod: 'PIX',
            type: 'VARIABLE',
        });

        expect(expenseCreate).toHaveBeenCalledWith({
            data: expect.objectContaining({
                userId: 'owner-a',
                amountInCents: BigInt(1090),
                installments: 1,
                date: null,
            }),
        });
    });

    it('persists recurring income fields', async () => {
        await createIncome(database, 'owner-a', {
            amountInCents: '125000',
            type: 'RECURRING',
            responsible: 'Tenant',
            description: 'Rent',
            date: '2026-11-15',
        });

        expect(incomeCreate).toHaveBeenCalledWith({
            data: expect.objectContaining({
                userId: 'owner-a',
                type: 'RECURRING',
                responsible: 'Tenant',
                description: 'Rent',
            }),
        });
    });

    it('rejects snapshots for investments belonging to another user', async () => {
        investmentFind.mockResolvedValue(null);

        await expect(addInvestmentSnapshot(database, 'owner-a', 'investment-b', {
            amountInCents: '15000',
            recordedAt: '2026-11-15',
        })).rejects.toThrow('Investment not found');

        expect(snapshotCreate).not.toHaveBeenCalled();
        expect(investmentFind).toHaveBeenCalledWith({
            where: { id: 'investment-b', userId: 'owner-a' },
            select: { id: true },
        });
    });

    it('allows repeated investment valuations for the same owner', async () => {
        investmentFind.mockResolvedValue({ id: 'investment-a' });

        await addInvestmentSnapshot(database, 'owner-a', 'investment-a', {
            amountInCents: '15800',
            recordedAt: '2026-11-15',
        });

        expect(snapshotCreate).toHaveBeenCalledWith({
            data: expect.objectContaining({
                investmentId: 'investment-a',
                userId: 'owner-a',
                amountInCents: BigInt(15800),
            }),
        });
    });
});
