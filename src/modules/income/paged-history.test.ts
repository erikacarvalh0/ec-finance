import { describe, expect, it, vi } from 'vitest';
import { getPagedIncomeHistory, incomeHistoryWhere } from './paged-history';

describe('paged income history', () => {
    it('combines month, search, category and owner filters', () => {
        const where = incomeHistoryWhere('owner', { archived: false, month: '2026-01', search: 'rent', categoryId: 'cat', type: 'OTHER' });
        expect(where).toMatchObject({ userId: 'owner', archivedAt: null, categoryId: 'cat', type: 'OTHER' });
        expect(where.AND).toHaveLength(2);
        expect(where.AND).toEqual(expect.arrayContaining([{ OR: [{ date: { gte: new Date('2026-01-01'), lt: new Date('2026-02-01') } }, { date: null, createdAt: { gte: new Date('2026-01-01'), lt: new Date('2026-02-01') } }] }]));
    });
    it.each([[0, '9', 0, 1], [1, '1', 1, 1], [20, '1', 1, 1], [21, '9', 2, 2], [61, '2', 4, 2]])('counts real pages for %i records', async (total, requested, pages, page) => {
        const count = vi.fn().mockResolvedValue(total);
        const findMany = vi.fn().mockResolvedValue([]);
        const db = { income: { count, findMany } } as unknown as Parameters<typeof getPagedIncomeHistory>[0];
        expect(await getPagedIncomeHistory(db, 'owner', { archived: true, page: requested })).toMatchObject({ total, pages, page });
        expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: (page - 1) * 20, take: 20, where: expect.objectContaining({ userId: 'owner', archivedAt: { not: null } }) }));
    });
});
