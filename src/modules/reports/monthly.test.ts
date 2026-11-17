import { describe, expect, it, vi } from 'vitest';
import { summarizeRecordedCashflow, getUserMonthlyCashflowReport } from './monthly';

describe('recorded cashflow reports', () => {
    it('sums recorded income and expenses by UTC month without projecting recurring records', () => {
        const result = summarizeRecordedCashflow(
            new Date('2026-11-01T00:00:00Z'),
            3,
            [
                { amountInCents: BigInt(20000), date: new Date('2026-11-15T00:00:00Z') },
                { amountInCents: BigInt(10000), date: new Date('2026-12-02T00:00:00Z') },
            ],
            [
                { amountInCents: BigInt(6500), date: new Date('2026-11-10T00:00:00Z'), linkedTransactionId: null },
                { amountInCents: BigInt(4500), date: new Date('2026-11-15T00:00:00Z'), linkedTransactionId: 'card-a' },
            ],
            [{ amountInCents: BigInt(4500), date: new Date('2026-11-15T00:00:00Z') }],
        );
        expect(result.map((month) => [month.incomeInCents, month.expenseInCents, month.netInCents]))
            .toEqual([
                [BigInt(20000), BigInt(11000), BigInt(9000)],
                [BigInt(10000), BigInt(0), BigInt(10000)],
                [BigInt(0), BigInt(0), BigInt(0)],
            ]);
    });

    it('queries only the signed-in user and a bounded period', async () => {
        const incomeFind = vi.fn().mockResolvedValue([]);
        const expenseFind = vi.fn().mockResolvedValue([]);
        const transactionFind = vi.fn().mockResolvedValue([]);
        const database = {
            income: { findMany: incomeFind },
            expense: { findMany: expenseFind },
            transaction: { findMany: transactionFind },
        } as unknown as Parameters<typeof getUserMonthlyCashflowReport>[0];

        await getUserMonthlyCashflowReport(
            database, 'owner-a', new Date('2026-11-01T00:00:00Z'), 6,
        );
        for (const spy of [incomeFind, expenseFind, transactionFind]) {
            expect(spy).toHaveBeenCalledWith(expect.objectContaining({
                where: expect.objectContaining({ userId: 'owner-a' }),
            }));
        }
    });

    it('rejects anonymous users and excessive reporting ranges before querying', async () => {
        const findMany = vi.fn();
        const database = {
            income: { findMany },
            expense: { findMany },
            transaction: { findMany },
        } as unknown as Parameters<typeof getUserMonthlyCashflowReport>[0];

        await expect(getUserMonthlyCashflowReport(
            database, ' ', new Date('2026-11-01T00:00:00Z'), 6,
        )).rejects.toThrow();
        await expect(getUserMonthlyCashflowReport(
            database, 'owner-a', new Date('2026-11-01T00:00:00Z'), 37,
        )).rejects.toThrow();
        expect(findMany).not.toHaveBeenCalled();
    });
});

describe('combined financial report filters', () => {
    it('scopes both queries and counts linked purchases once', async () => {
        const income = vi.fn().mockResolvedValue([]);
        const expense = vi.fn().mockResolvedValue([
            { amountInCents: BigInt(1001), date: new Date('2026-11-05'), linkedTransactionId: 'txn' },
            { amountInCents: BigInt(502), date: new Date('2026-11-05'), linkedTransactionId: null },
        ]);
        const transaction = vi.fn().mockResolvedValue([
            { amountInCents: BigInt(1001), occurredAt: new Date('2026-11-05') },
        ]);
        const database = {
            income: { findMany: income }, expense: { findMany: expense },
            transaction: { findMany: transaction },
        } as unknown as Parameters<typeof getUserMonthlyCashflowReport>[0];
        const [month] = await getUserMonthlyCashflowReport(database, 'owner', new Date('2026-11-01'), 1, 'category', 'card');
        expect(income).not.toHaveBeenCalled();
        for (const query of [expense, transaction]) {
            expect(query).toHaveBeenCalledWith(expect.objectContaining({
                where: expect.objectContaining({ userId: 'owner', categoryId: 'category', cardId: 'card' }),
            }));
        }
        expect(month.expenseInCents).toBe(BigInt(1503));
        expect(month.netInCents).toBe(BigInt(-1503));
    });
});
