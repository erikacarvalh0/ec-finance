import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { getCategoryBudgetReport, setCategoryBudget } from './service';
import { applyBudgetRollover } from './rollover';

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

    it('persists a capped rollover once under concurrency and preserves it on budget edits', async () => {
        for (const period of ['2026-12', '2027-01', '2027-02']) {
            await setCategoryBudget(prisma, ownerId, { categoryId, period, limitInCents: '10000' });
        }
        const input = { categoryId, period: '2027-01', capInCents: '3000' };
        const results = await Promise.all([
            applyBudgetRollover(prisma, ownerId, input),
            applyBudgetRollover(prisma, ownerId, input),
        ]);
        expect(results.filter(result => result.applied)).toHaveLength(1);
        await expect(applyBudgetRollover(prisma, otherId, input)).rejects.toThrow('Budget not found');
        await setCategoryBudget(prisma, ownerId, { categoryId, period: '2027-01', limitInCents: '12000' });
        expect((await getCategoryBudgetReport(prisma, ownerId, '2027-01')).categories[0])
            .toMatchObject({ limitInCents: BigInt(15000), remainingInCents: BigInt(15000), rolloverApplied: true });
        expect(await applyBudgetRollover(prisma, ownerId, { ...input, capInCents: '9000' }))
            .toMatchObject({ applied: false });
        const saved = await prisma.categoryBudget.findFirstOrThrow({
            where: { userId: ownerId, categoryId, period: '2027-01' },
        });
        expect(saved.rolloverInCents).toBe(BigInt(3000));
        expect(saved.rolloverCapInCents).toBe(BigInt(3000));
        await applyBudgetRollover(prisma, ownerId, { ...input, period: '2027-02', capInCents: '20000' });
        expect((await getCategoryBudgetReport(prisma, ownerId, '2027-02')).categories[0].limitInCents)
            .toBe(BigInt(25000));
        await expect(prisma.categoryBudget.update({
            where: { id: saved.id }, data: { rolloverInCents: BigInt(3001) },
        })).rejects.toThrow();
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
