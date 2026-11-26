import { PrismaClient } from '@prisma/client';
import { describe, expect, it } from 'vitest';

const enabled = process.env.RUN_CATEGORY_DB_TESTS === '1';
describe.skipIf(!enabled)('category defaults on PostgreSQL', () => {
    it('creates defaults once and never restores deleted categories', async () => {
        const db = new PrismaClient();
        let userId: string | undefined;
        try {
            const user = await db.user.create({ data: {} });
            userId = user.id;
            const categories = await db.category.findMany({ where: { userId } });
            expect(categories).toHaveLength(10);
            expect(categories.filter(c => c.type === 'EXPENSE')).toHaveLength(5);
            expect(categories.filter(c => c.type === 'INCOME')).toHaveLength(5);
            const food = categories.find(c => c.name === 'Alimentação')!;
            expect(food.color).toBe('#16C6A2');
            expect(food.iconBackground).toBe('#D4F7EE');
            await db.category.delete({ where: { id: food.id } });
            await db.$queryRaw`SELECT initialize_finance_categories(${userId})::text`;
            expect(await db.category.count({ where: { userId } })).toBe(9);
        } finally {
            if (userId) await db.user.delete({ where: { id: userId } });
            await db.$disconnect();
        }
    });
});
