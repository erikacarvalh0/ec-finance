import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { createIncome } from '@/modules/finance/service';
import { updateForecastOccurrence } from '@/modules/forecast/occurrences';
import { getUserCashflowForecast } from '@/modules/forecast/repository';

if (!(process.env.DATABASE_URL ?? '').includes('ec_finance_test')) {
    throw new Error('Income recurrence integration tests require ec_finance_test.');
}

const prisma = new PrismaClient();
const id = randomUUID();

describe('PostgreSQL recurring income settlement', () => {
    let ownerId = '';
    let foreignId = '';
    let incomeId = '';
    beforeAll(async () => {
        const owner = await prisma.user.create({ data: { email: `income-occ-${id}@example.test` } });
        const foreign = await prisma.user.create({ data: { email: `income-occ-foreign-${id}@example.test` } });
        ownerId = owner.id;
        foreignId = foreign.id;
        const income = await createIncome(prisma, ownerId, {
            type: 'RECURRING', amountInCents: '12000',
            responsible: 'Tenant', description: 'Rent', date: '2027-07-15',
        });
        incomeId = income.id;
    });
    afterAll(async () => {
        if (ownerId && foreignId) {
            await prisma.user.deleteMany({ where: { id: { in: [ownerId, foreignId] } } });
        }
        await prisma.$disconnect();
    });
    it('settles one recurring month and leaves adjacent months pending', async () => {
        await updateForecastOccurrence(prisma, ownerId, 'income', incomeId, {
            month: '2027-08', status: 'SETTLED', actualAmountInCents: '12500',
        });
        const forecast = await getUserCashflowForecast(
            prisma, ownerId, new Date('2027-07-01T00:00:00.000Z'), 3,
        );
        expect(forecast.map(month => month.incomes.find(row => row.sourceId === incomeId)?.status))
            .toEqual(['PENDING', 'SETTLED', 'PENDING']);
        expect(forecast[1].settledIncomeInCents).toBe(BigInt(12500));
        expect(await prisma.incomeOccurrence.count({ where: { incomeId } })).toBe(1);
    });
    it('does not allow another owner to settle the recurring income', async () => {
        await expect(updateForecastOccurrence(prisma, foreignId, 'income', incomeId, {
            month: '2027-09', status: 'SETTLED',
        })).rejects.toThrow('Forecast source not found');
        expect(await prisma.incomeOccurrence.count({ where: { userId: foreignId } })).toBe(0);
    });
});
