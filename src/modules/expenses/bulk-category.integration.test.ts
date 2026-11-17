import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { bulkReclassifyExpenses } from './bulk-category';

if (!(process.env.DATABASE_URL ?? '').includes('ec_finance_test')) {
    throw new Error('Dedicated integration database required');
}
const prisma = new PrismaClient();
const users: string[] = [];
afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: users } } });
    await prisma.$disconnect();
});
describe('bulk classification transaction', () => {
    it('rolls back the owned update when a foreign expense is included', async () => {
        const owner = await prisma.user.create({ data: { email: randomUUID() + '@example.test' } });
        users.push(owner.id);
        const foreign = await prisma.user.create({ data: { email: randomUUID() + '@example.test' } });
        users.push(foreign.id);
        const category = await prisma.category.create({ data: { userId: owner.id, name: 'Food' } });
        const create = (userId: string) => prisma.expense.create({ data: {
            userId, description: 'Purchase', amountInCents: BigInt(100),
            paymentMethod: 'PIX', type: 'VARIABLE',
        } });
        const a = await create(owner.id);
        const b = await create(foreign.id);
        await expect(bulkReclassifyExpenses(prisma, owner.id, [a.id, b.id], category.id)).rejects.toThrow();
        expect((await prisma.expense.findUniqueOrThrow({ where: { id: a.id } })).categoryId).toBeNull();
        expect(await bulkReclassifyExpenses(prisma, owner.id, [a.id], category.id)).toBe(1);
        expect((await prisma.expense.findUniqueOrThrow({ where: { id: a.id } })).categoryId).toBe(category.id);
    });
});
