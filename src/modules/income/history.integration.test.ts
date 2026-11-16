import { randomUUID } from 'node:crypto';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { listFilteredIncomes } from './history';

if (!(process.env.DATABASE_URL ?? '').includes('ec_finance_test')) {
    throw new Error('Income history integration tests require ec_finance_test.');
}

const prisma = new PrismaClient();
const unique = randomUUID();

describe('PostgreSQL income history filtering', () => {
    let ownerId = '';
    let otherId = '';

    beforeAll(async () => {
        const owner = await prisma.user.create({
            data: { email: `income-history-owner-${unique}@example.test` },
        });
        const other = await prisma.user.create({
            data: { email: `income-history-other-${unique}@example.test` },
        });
        ownerId = owner.id;
        otherId = other.id;

        await prisma.income.createMany({
            data: [
                ...Array.from({ length: 23 }, (_, index) => ({
                    userId: ownerId,
                    amountInCents: BigInt(15000 + index),
                    type: 'RECURRING' as const,
                    responsible: 'Tenant Company',
                    description: `Rental payment ${index}`,
                    date: new Date('2026-11-15T00:00:00.000Z'),
                })),
                {
                    userId: ownerId,
                    amountInCents: BigInt(50000),
                    type: 'SALARY' as const,
                },
                {
                    userId: otherId,
                    amountInCents: BigInt(999999),
                    type: 'RECURRING' as const,
                    responsible: 'Tenant Company',
                    description: 'Private rental payment',
                    date: new Date('2026-11-15T00:00:00.000Z'),
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

    it('returns stable non-overlapping pages without exposing other owners', async () => {
        const filters = { type: 'RECURRING' as const, search: 'rental' };
        const first = await listFilteredIncomes(prisma, ownerId, filters);
        const second = await listFilteredIncomes(prisma, ownerId, {
            ...filters,
            cursor: first.nextCursor ?? undefined,
        });

        expect(first.incomes).toHaveLength(20);
        expect(second.incomes).toHaveLength(3);
        expect(second.nextCursor).toBeNull();
        expect(new Set([...first.incomes, ...second.incomes].map((item) => item.id)).size)
            .toBe(23);
        expect(first.incomes.every((item) => item.userId === ownerId)).toBe(true);
        expect(second.incomes.every((item) => item.userId === ownerId)).toBe(true);
    });

    it('filters by the specified income type and keeps owners isolated', async () => {
        const salary = await listFilteredIncomes(prisma, ownerId, { type: 'SALARY' });
        expect(salary.incomes).toHaveLength(1);

        const privateRows = await listFilteredIncomes(prisma, otherId, {
            search: 'private',
        });
        expect(privateRows.incomes).toHaveLength(1);
        expect(privateRows.incomes[0].userId).toBe(otherId);
    });
});
