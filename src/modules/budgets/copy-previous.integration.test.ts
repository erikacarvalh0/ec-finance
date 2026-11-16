import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { copyPreviousMonthBudgets } from './copy-previous';

if (!(process.env.DATABASE_URL ?? '').includes('ec_finance_test')) {
    throw new Error('Budget copy integration requires ec_finance_test.');
}

const prisma = new PrismaClient();
const uid = randomUUID();

describe('PostgreSQL previous-month budget copying', () => {
    let ownerId = '';
    let foreignOwnerId = '';
    let categoryA = '';
    let categoryB = '';

    beforeAll(async () => {
        const owner = await prisma.user.create({
            data: { email: `budget-copy-owner-${uid}@example.test` },
        });
        const other = await prisma.user.create({
            data: { email: `budget-copy-other-${uid}@example.test` },
        });
        ownerId = owner.id;
        foreignOwnerId = other.id;
        const categories = await Promise.all([
            prisma.category.create({ data: { userId: ownerId, name: `Food-${uid}` } }),
            prisma.category.create({ data: { userId: ownerId, name: `Rent-${uid}` } }),
        ]);
        categoryA = categories[0].id;
        categoryB = categories[1].id;

        await prisma.categoryBudget.createMany({
            data: [
                { userId: ownerId, categoryId: categoryA, period: '2026-12', limitInCents: BigInt(30000) },
                { userId: ownerId, categoryId: categoryB, period: '2026-12', limitInCents: BigInt(80000) },
                { userId: ownerId, categoryId: categoryA, period: '2027-01', limitInCents: BigInt(40000) },
            ],
        });
    });

    afterAll(async () => {
        if (ownerId && foreignOwnerId) {
            await prisma.user.deleteMany({ where: { id: { in: [ownerId, foreignOwnerId] } } });
        }
        await prisma.$disconnect();
    });

    it('preserves custom target limits, copies missing ones and safely handles retries', async () => {
        const first = await copyPreviousMonthBudgets(prisma, ownerId, '2027-01');
        expect(first).toEqual({ sourcePeriod: '2026-12', targetPeriod: '2027-01', copied: 1, found: 2 });
        const second = await copyPreviousMonthBudgets(prisma, ownerId, '2027-01');
        expect(second.copied).toBe(0);
        const rows = await prisma.categoryBudget.findMany({
            where: { userId: ownerId, period: '2027-01' },
        });
        expect(rows).toHaveLength(2);
        expect(rows.find(row => row.categoryId === categoryA)?.limitInCents).toBe(BigInt(40000));
        expect(rows.find(row => row.categoryId === categoryB)?.limitInCents).toBe(BigInt(80000));
    });

    it('does not read or create any budgets from another user', async () => {
        const result = await copyPreviousMonthBudgets(prisma, foreignOwnerId, '2027-01');
        expect(result).toEqual({ sourcePeriod: '2026-12', targetPeriod: '2027-01', copied: 0, found: 0 });
        expect(await prisma.categoryBudget.count({ where: { userId: foreignOwnerId } })).toBe(0);
    });
});
