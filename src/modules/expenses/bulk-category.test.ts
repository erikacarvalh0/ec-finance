import { describe, expect, it, vi } from 'vitest';
import { bulkReclassifyExpenses } from './bulk-category';

describe('bulk expense reclassification', () => {
    it('rejects duplicate selections before accessing the database', async () => {
        const db = { $transaction: vi.fn() } as unknown as Parameters<typeof bulkReclassifyExpenses>[0];
        await expect(bulkReclassifyExpenses(db, 'owner', ['a', 'a'], null)).rejects.toThrow();
        expect(db.$transaction).not.toHaveBeenCalled();
    });
});
