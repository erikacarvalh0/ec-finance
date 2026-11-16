import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { updateForecastOccurrence } from './occurrences';
import { getUserCashflowForecast } from './repository';

const databaseUrl = process.env.DATABASE_URL ?? '';

if (!databaseUrl.includes('ec_finance_test')) {
    throw new Error('A dedicated ec_finance_test database is required.');
}

const prisma = new PrismaClient();
const id = `forecast-${Date.now()}`;
let ownerId = '';
let otherOwnerId = '';
let expenseId = '';
let incomeId = '';

describe('PostgreSQL forecast reconciliation', () => {
    beforeAll(async () => {
        const owner = await prisma.user.create({
            data: { email: `${id}-a@example.test` },
        });
        const otherOwner = await prisma.user.create({
            data: { email: `${id}-b@example.test` },
        });

        ownerId = owner.id;
        otherOwnerId = otherOwner.id;

        const expense = await prisma.expense.create({
            data: {
                userId: ownerId,
                description: 'Phone',
                amountInCents: BigInt(9000),
                type: 'VARIABLE',
                paymentMethod: 'CREDIT',
                installments: 3,
                date: new Date('2027-01-05T00:00:00.000Z'),
            },
        });
        const income = await prisma.income.create({
            data: {
                userId: ownerId,
                description: 'Rent',
                responsible: 'Tenant',
                amountInCents: BigInt(15000),
                type: 'RECURRING',
                date: new Date('2027-01-10T00:00:00.000Z'),
            },
        });

        expenseId = expense.id;
        incomeId = income.id;
    });

    afterAll(async () => {
        if (ownerId && otherOwnerId) {
            await prisma.user.deleteMany({
                where: { id: { in: [ownerId, otherOwnerId] } },
            });
        }

        await prisma.$disconnect();
    });

    it('settles one installment but retains other months as pending', async () => {
        await updateForecastOccurrence(prisma, ownerId, 'expense', expenseId, {
            month: '2027-02',
            status: 'SETTLED',
            actualAmountInCents: '2800',
        });

        const months = await getUserCashflowForecast(
            prisma,
            ownerId,
            new Date('2027-01-01T00:00:00.000Z'),
            3,
        );

        expect(months.map((month) => month.expenses.find(
            (item) => item.sourceId === expenseId,
        )?.status)).toEqual(['PENDING', 'SETTLED', 'PENDING']);
        expect(months[1].settledExpenseInCents).toBe(BigInt(2800));
        expect(months[2].pendingExpenseInCents).toBe(BigInt(3000));
    });

    it('cancels one income occurrence without cancelling the series', async () => {
        await updateForecastOccurrence(prisma, ownerId, 'income', incomeId, {
            month: '2027-02',
            status: 'CANCELED',
        });

        const months = await getUserCashflowForecast(
            prisma,
            ownerId,
            new Date('2027-01-01T00:00:00.000Z'),
            3,
        );

        expect(months.map((month) => month.incomes.find(
            (item) => item.sourceId === incomeId,
        )?.status)).toEqual(['PENDING', 'CANCELED', 'PENDING']);
        expect(months[1].incomeTotalInCents).toBe(BigInt(0));
    });

    it('blocks writing an adjustment to an expense owned by another user', async () => {
        await expect(updateForecastOccurrence(
            prisma,
            otherOwnerId,
            'expense',
            expenseId,
            { month: '2027-01', status: 'SETTLED' },
        )).rejects.toThrow('Forecast source not found');

        expect(await prisma.expenseOccurrence.count({
            where: { userId: otherOwnerId },
        })).toBe(0);
    });

    it('updates an existing occurrence instead of creating duplicates', async () => {
        await updateForecastOccurrence(prisma, ownerId, 'expense', expenseId, {
            month: '2027-02',
            status: 'PENDING',
        });

        expect(await prisma.expenseOccurrence.count({
            where: {
                expenseId,
                dueMonth: new Date('2027-02-01T00:00:00.000Z'),
            },
        })).toBe(1);
    });
});
