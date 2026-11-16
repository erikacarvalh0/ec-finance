import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { listFilteredExpenses } from './history';

if (!(process.env.DATABASE_URL ?? '').includes('ec_finance_test')) {
    throw new Error('Expense history integration tests require ec_finance_test.');
}

const prisma = new PrismaClient();
const runId = randomUUID();

describe('PostgreSQL expense history', () => {
    let ownerId = '';
    let otherId = '';

    beforeAll(async () => {
        const owner = await prisma.user.create({
            data: { email: `expense-filter-owner-${runId}@example.test` },
        });
        const other = await prisma.user.create({
            data: { email: `expense-filter-other-${runId}@example.test` },
        });
        ownerId = owner.id;
        otherId = other.id;

        await prisma.expense.createMany({
            data: [
                ...Array.from({ length: 23 }, (_, index) => ({
                    userId: ownerId,
                    description: `Groceries ${index}`,
                    amountInCents: BigInt(1000 + index),
                    type: 'VARIABLE' as const,
                    paymentMethod: 'PIX' as const,
                })),
                {
                    userId: ownerId,
                    description: 'Rent',
                    amountInCents: BigInt(50000),
                    type: 'FIXED' as const,
                    paymentMethod: 'AUTOMATIC_DEBIT' as const,
                },
                {
                    userId: otherId,
                    description: 'Private groceries',
                    amountInCents: BigInt(99999),
                    type: 'VARIABLE' as const,
                    paymentMethod: 'PIX' as const,
                },
            ],
        });
    });

    afterAll(async () => {
        if (ownerId && otherId) {
            await prisma.user.deleteMany({
                where: { id: { in: [ownerId, otherId] } },
            });
        }
        await prisma.$disconnect();
    });

    it('paginates nonoverlapping owner-scoped results with filters', async () => {
        const criteria = { type: 'VARIABLE' as const, paymentMethod: 'PIX' as const, search: 'grocer' };
        const first = await listFilteredExpenses(prisma, ownerId, criteria);
        const second = await listFilteredExpenses(prisma, ownerId, {
            ...criteria,
            cursor: first.nextCursor ?? undefined,
        });

        expect(first.expenses).toHaveLength(20);
        expect(second.expenses).toHaveLength(3);
        expect(second.nextCursor).toBeNull();
        expect(new Set([...first.expenses, ...second.expenses].map((item) => item.id)).size)
            .toBe(23);
        expect([...first.expenses, ...second.expenses].every((item) => item.userId === ownerId))
            .toBe(true);
    });

    it('filters fixed expenses without leaking other users purchases', async () => {
        const result = await listFilteredExpenses(prisma, ownerId, {
            type: 'FIXED',
        });

        expect(result.expenses).toHaveLength(1);
        expect(result.expenses[0].description).toBe('Rent');
    });
});
