import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { createFinancialGoal, listFinancialGoals } from './service';

if (!(process.env.DATABASE_URL ?? '').includes('ec_finance_test')) {
    throw new Error('Financial goals integration requires ec_finance_test.');
}

const prisma = new PrismaClient();
const runId = randomUUID();

describe('PostgreSQL financial goal tenant isolation', () => {
    let ownerId = '';
    let otherId = '';
    let goalId = '';

    beforeAll(async () => {
        const owner = await prisma.user.create({
            data: { email: `goal-owner-${runId}@example.test` },
        });
        const other = await prisma.user.create({
            data: { email: `goal-other-${runId}@example.test` },
        });
        ownerId = owner.id;
        otherId = other.id;
    });

    afterAll(async () => {
        if (ownerId && otherId) {
            await prisma.user.deleteMany({
                where: { id: { in: [ownerId, otherId] } },
            });
        }
        await prisma.$disconnect();
    });

    it('persists a goal with exact bigint cents and a valid UTC deadline', async () => {
        const goal = await createFinancialGoal(prisma, ownerId, {
            name: 'Emergency fund',
            targetInCents: '90071992547409930',
            savedInCents: '250000',
            deadline: '2027-12-31',
        });
        goalId = goal.id;
        expect(goal.targetInCents).toBe(BigInt('90071992547409930'));
        expect(goal.deadline?.toISOString()).toBe('2027-12-31T00:00:00.000Z');

        const stored = await prisma.financialGoal.findUniqueOrThrow({
            where: { id: goal.id },
        });
        expect(stored.savedInCents).toBe(BigInt(250000));
        expect(stored.userId).toBe(ownerId);
    });

    it('does not reveal another user goals through the service', async () => {
        const goals = await listFinancialGoals(prisma, otherId);
        expect(goals).toEqual([]);
        expect((await listFinancialGoals(prisma, ownerId)).map((goal) => goal.id))
            .toContain(goalId);
    });

    it('rejects invalid amounts without inserting a record', async () => {
        const before = await prisma.financialGoal.count({ where: { userId: ownerId } });
        await expect(createFinancialGoal(prisma, ownerId, {
            name: 'Invalid',
            targetInCents: '100',
            savedInCents: '101',
        })).rejects.toThrow();
        expect(await prisma.financialGoal.count({ where: { userId: ownerId } }))
            .toBe(before);
    });

    it('prevents direct records with an unknown owner at the database layer', async () => {
        await expect(prisma.financialGoal.create({
            data: {
                userId: 'nonexistent-owner',
                name: 'Orphan goal',
                targetInCents: BigInt(100),
                savedInCents: BigInt(0),
            },
        })).rejects.toThrow();
    });
});
