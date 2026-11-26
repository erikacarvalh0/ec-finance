import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createCategory, listCategories } from './service';

const findMany = vi.fn();
const create = vi.fn();
const database = {
    category: {
        findMany,
        create,
    },
} as unknown as Parameters<typeof listCategories>[0];

describe('category service', () => {
    beforeEach(() => {
        findMany.mockReset();
        create.mockReset();
    });

    it('lists categories belonging only to the authenticated user', async () => {
        findMany.mockResolvedValue([]);

        await listCategories(database, 'owner-a');

        expect(findMany).toHaveBeenCalledWith({
            where: { userId: 'owner-a', type: 'EXPENSE' },
            orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
            select: { id: true, name: true },
        });
    });

    it('creates a normalized category owned by the session user', async () => {
        create.mockResolvedValue({ id: 'new-category', name: 'Groceries' });

        await createCategory(database, 'owner-a', '  Groceries  ');

        expect(create).toHaveBeenCalledWith({
            data: { userId: 'owner-a', name: 'Groceries' },
            select: { id: true, name: true },
        });
    });

    it.each(['', '   '])('rejects empty category names', async (name) => {
        await expect(createCategory(database, 'owner-a', name)).rejects.toThrow();
        expect(create).not.toHaveBeenCalled();
    });

    it('rejects excessively long category names', async () => {
        await expect(createCategory(database, 'owner-a', 'x'.repeat(101))).rejects.toThrow();
        expect(create).not.toHaveBeenCalled();
    });

    it('rejects unauthenticated owner IDs', async () => {
        await expect(listCategories(database, ' ')).rejects.toThrow();
        await expect(createCategory(database, ' ', 'Groceries')).rejects.toThrow();
        expect(findMany).not.toHaveBeenCalled();
        expect(create).not.toHaveBeenCalled();
    });
});
