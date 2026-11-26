import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { getCategoryBudgetReport } from './service';

if (!(process.env.DATABASE_URL ?? '').includes('ec_finance_test')) {
    throw new Error('Card budget integration tests require ec_finance_test.');
}
const prisma = new PrismaClient();
const id = randomUUID();

describe('PostgreSQL card due-month category spending', () => {
    let ownerId = '';
    let otherId = '';
    let categoryId = '';
    beforeAll(async () => {
        const owner = await prisma.user.create({ data: { email: `card-budget-${id}@example.test` } });
        const other = await prisma.user.create({ data: { email: `card-budget-other-${id}@example.test` } });
        ownerId = owner.id;
        otherId = other.id;
        const category = await prisma.category.create({ data: { userId: ownerId, name: 'Transport' } });
        categoryId = category.id;
        const connection = await prisma.bankConnection.create({ data: {
            userId: ownerId, provider: 'MANUAL', externalItemId: `card-budget-${id}`,
        } });
        const card = await prisma.creditCard.create({ data: {
            userId: ownerId, connectionId: connection.id,
            externalAccountId: `card-budget-${id}`, name: 'Test card',
            closingDay: 20, dueDay: 10,
        } });
        await prisma.expense.create({ data: {
            userId: ownerId, categoryId, cardId: card.id,
            description: 'After closing', amountInCents: BigInt(10001),
            type: 'VARIABLE', paymentMethod: 'CREDIT', installments: 3,
            date: new Date('2027-01-21T00:00:00.000Z'),
        } });
    });
    afterAll(async () => {
        if (ownerId && otherId) {
            await prisma.user.deleteMany({ where: { id: { in: [ownerId, otherId] } } });
        }
        await prisma.$disconnect();
    });
    it('allocates installments to invoice due months without leaking to other owners', async () => {
        const spent = async (period: string) =>
            (await getCategoryBudgetReport(prisma, ownerId, period)).categories.find(row => row.categoryId === categoryId)!.spentInCents;
        expect(await spent('2027-01')).toBe(BigInt(0));
        expect(await spent('2027-02')).toBe(BigInt(0));
        expect(await spent('2027-03')).toBe(BigInt(3334));
        expect(await spent('2027-04')).toBe(BigInt(3334));
        expect(await spent('2027-05')).toBe(BigInt(3333));
        const otherCategories = (await getCategoryBudgetReport(prisma, otherId, '2027-03')).categories;
        expect(otherCategories).toHaveLength(5);
        expect(otherCategories.every(row => row.categoryId !== categoryId && row.spentInCents === BigInt(0))).toBe(true);
    });
});
