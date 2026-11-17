import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { createIncome } from '@/modules/finance/service';
import { updateOwnedIncome } from '@/modules/finance/edit-record';
import { getUserCashflowForecast } from '@/modules/forecast/repository';
import { setIncomeArchived } from './archive';
import { listFilteredIncomes } from './history';

if (!(process.env.DATABASE_URL ?? '').includes('ec_finance_test')) {
    throw new Error('Income lifecycle requires ec_finance_test.');
}
const prisma = new PrismaClient();
const id = randomUUID();

describe('PostgreSQL income lifecycle', () => {
    let ownerId = '';
    let otherId = '';
    beforeAll(async () => {
        ownerId = (await prisma.user.create({ data: { email: `lifecycle-${id}@example.test` } })).id;
        otherId = (await prisma.user.create({ data: { email: `lifecycle-other-${id}@example.test` } })).id;
    });
    afterAll(async () => {
        await prisma.user.deleteMany({ where: { id: { in: [ownerId, otherId] } } });
        await prisma.$disconnect();
    });
    it('edits, ends, archives and restores a recurring income without losing history', async () => {
        const input = { type: 'RECURRING' as const, amountInCents: '10000',
            responsible: 'Tenant', description: 'Rent', date: '2027-01-15' };
        const income = await createIncome(prisma, ownerId, input);
        const edit = { ...input, amountInCents: '12000', endsOn: '2027-02-15' };
        await expect(updateOwnedIncome(prisma, otherId, income.id, edit)).rejects.toThrow('Record not found');
        await updateOwnedIncome(prisma, ownerId, income.id, edit);
        const months = await getUserCashflowForecast(prisma, ownerId, new Date('2027-01-01T00:00:00Z'), 3);
        expect(months.map(month => month.incomeTotalInCents)).toEqual([BigInt(12000), BigInt(12000), BigInt(0)]);
        expect(await setIncomeArchived(prisma, otherId, income.id, true)).toBe(false);
        expect(await setIncomeArchived(prisma, ownerId, income.id, true)).toBe(true);
        expect((await listFilteredIncomes(prisma, ownerId, { search: 'Rent' })).incomes).toHaveLength(0);
        expect((await listFilteredIncomes(prisma, ownerId, { archived: true, type: 'RECURRING' })).incomes[0].id).toBe(income.id);
        expect(await setIncomeArchived(prisma, ownerId, income.id, false)).toBe(true);
        expect((await listFilteredIncomes(prisma, ownerId, { search: 'Rent' })).incomes[0].amountInCents).toBe(BigInt(12000));
    });
});
