import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { createIncome, listIncomes } from '@/modules/finance/service';

if (!(process.env.DATABASE_URL ?? '').includes('ec_finance_test')) {
    throw new Error('Income integration tests require ec_finance_test.');
}

const prisma = new PrismaClient();
const unique = randomUUID();

describe('PostgreSQL income creation and recurrence metadata', () => {
    let ownerId = '';
    let otherId = '';

    beforeAll(async () => {
        const owner = await prisma.user.create({ data: {
            email: `income-create-owner-${unique}@example.test`,
        } });
        const other = await prisma.user.create({ data: {
            email: `income-create-other-${unique}@example.test`,
        } });
        ownerId = owner.id;
        otherId = other.id;
    });
    afterAll(async () => {
        if (ownerId && otherId) {
            await prisma.user.deleteMany({ where: { id: { in: [ownerId, otherId] } } });
        }
        await prisma.$disconnect();
    });
    it('persists recurring income details and isolates income listings by owner', async () => {
        const created = await createIncome(prisma, ownerId, {
            type: 'RECURRING', amountInCents: '12345',
            responsible: 'Tenant', description: 'Monthly rent', date: '2027-01-15',
        });
        expect(created.amountInCents).toBe(BigInt(12345));
        expect(created.date).toEqual(new Date('2027-01-15T00:00:00.000Z'));
        const owned = await listIncomes(prisma, ownerId);
        const foreign = await listIncomes(prisma, otherId);
        expect(owned.some(income => income.id === created.id)).toBe(true);
        expect(foreign.some(income => income.id === created.id)).toBe(false);
    });
    it('rejects malformed recurring income before writing', async () => {
        const before = await prisma.income.count({ where: { userId: ownerId } });
        await expect(createIncome(prisma, ownerId, {
            type: 'RECURRING', amountInCents: '-100',
            responsible: 'Tenant', description: 'Invalid rent', date: '2027-02-15',
        })).rejects.toThrow();
        expect(await prisma.income.count({ where: { userId: ownerId } })).toBe(before);
    });
});
