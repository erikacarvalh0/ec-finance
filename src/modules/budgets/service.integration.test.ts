import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { getCategoryBudgetReport, setCategoryBudget } from './service';

if (!(process.env.DATABASE_URL ?? '').includes('ec_finance_test')) {
    throw new Error('Budget integration tests require the dedicated ec_finance_test database.');
}

const prisma = new PrismaClient();
const runId = randomUUID();

describe('PostgreSQL category budget ownership', () => {
    let ownerId: string;
    let otherId: string;
    let categoryId: string;

    beforeAll(async () => {
        const owner = await prisma.user.create({
            data: { email: `budget-owner-${runId}@example.test` },
        });
        const other = await prisma.user.create({
            data: { email: `budget-other-${runId}@example.test` },
        });
        ownerId = owner.id;
        otherId = other.id;
        const category = await prisma.category.create({
            data: { userId: ownerId, name: 'Groceries' },
        });
        categoryId = category.id;
    });

    afterAll(async () => {
        if (ownerId && otherId) {
            await prisma.user.deleteMany({
                where: { id: { in: [ownerId, otherId] } },
            });
        }
        await prisma.$disconnect();
    });

    it('creates and replaces a single monthly budget and calculates recorded spending', async () => {
        await setCategoryBudget(prisma, ownerId, {
            categoryId, period: '2026-11', limitInCents: '30000',
        });
        await setCategoryBudget(prisma, ownerId, {
            categoryId, period: '2026-11', limitInCents: '20000',
        });

        await prisma.expense.create({
            data: {
                userId: ownerId,
                categoryId,
                description: 'Groceries',
                amountInCents: BigInt(16500),
                paymentMethod: 'PIX',
                type: 'VARIABLE',
                date: new Date('2026-11-15T00:00:00.000Z'),
            },
        });

        const report = await getCategoryBudgetReport(prisma, ownerId, '2026-11');

        expect(report.categories).toEqual([expect.objectContaining({
            categoryId,
            limitInCents: BigInt(20000),
            spentInCents: BigInt(16500),
            status: 'NEAR_LIMIT',
        })]);
        expect(await prisma.categoryBudget.count({
            where: { userId: ownerId, categoryId, period: '2026-11' },
        })).toBe(1);
    });

    it('does not reveal or change another user category budgets', async () => {
        await expect(setCategoryBudget(prisma, otherId, {
            categoryId, period: '2026-11', limitInCents: '1000',
        })).rejects.toThrow('Category not found');

        const report = await getCategoryBudgetReport(prisma, otherId, '2026-11');
        expect(report.categories).toEqual([]);
    });

    it('rejects direct foreign-owned category relationships in PostgreSQL', async () => {
        await expect(prisma.expense.create({
            data: {
                userId: otherId,
                categoryId,
                description: 'Forbidden classification',
                amountInCents: BigInt(100),
                paymentMethod: 'PIX',
                type: 'VARIABLE',
            },
        })).rejects.toThrow();
    });
});
