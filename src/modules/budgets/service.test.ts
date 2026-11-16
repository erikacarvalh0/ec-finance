import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getCategoryBudgetReport, setCategoryBudget } from './service';

const categoryFind = vi.fn();
const budgetUpsert = vi.fn();
const budgetList = vi.fn();
const categoryList = vi.fn();
const expenseList = vi.fn();
const transactionList = vi.fn();

const database = {
    category: { findFirst: categoryFind, findMany: categoryList },
    categoryBudget: { upsert: budgetUpsert, findMany: budgetList },
    expense: { findMany: expenseList },
    transaction: { findMany: transactionList },
} as unknown as Parameters<typeof setCategoryBudget>[0];

describe('owner-scoped budget service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        categoryFind.mockResolvedValue({ id: 'category-a' });
        categoryList.mockResolvedValue([{ id: 'category-a', name: 'Mercado' }]);
        budgetList.mockResolvedValue([]);
        expenseList.mockResolvedValue([]);
        transactionList.mockResolvedValue([]);
    });

    it('rejects a category owned by another user without writing a budget', async () => {
        categoryFind.mockResolvedValue(null);
        await expect(setCategoryBudget(database, 'owner-a', {
            categoryId: 'private-category', period: '2026-11', limitInCents: '20000',
        })).rejects.toThrow('Category not found');
        expect(budgetUpsert).not.toHaveBeenCalled();
    });

    it('creates or replaces one budget per category per month for the owner', async () => {
        await setCategoryBudget(database, 'owner-a', {
            categoryId: 'category-a', period: '2026-11', limitInCents: '20000',
        });
        expect(budgetUpsert).toHaveBeenCalledWith({
            where: {
                userId_categoryId_period: {
                    userId: 'owner-a', categoryId: 'category-a', period: '2026-11',
                },
            },
            create: {
                userId: 'owner-a', categoryId: 'category-a',
                period: '2026-11', limitInCents: BigInt(20000),
            },
            update: { limitInCents: BigInt(20000) },
        });
    });

    it('rejects empty and negative budgets', async () => {
        for (const limitInCents of ['0', '-10', '1.5']) {
            await expect(setCategoryBudget(database, 'owner-a', {
                categoryId: 'category-a', period: '2026-11', limitInCents,
            })).rejects.toThrow();
        }
        expect(budgetUpsert).not.toHaveBeenCalled();
    });

    it('scopes all report reads to the authenticated owner and month', async () => {
        await getCategoryBudgetReport(database, 'owner-a', '2026-11');
        for (const query of [categoryList, budgetList, expenseList, transactionList]) {
            expect(query).toHaveBeenCalledWith(expect.objectContaining({
                where: expect.objectContaining({ userId: 'owner-a' }),
            }));
        }
    });
});
