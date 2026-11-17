import { describe, expect, it, vi } from 'vitest';
import { bulkReclassifyTransactions } from './bulk-transactions';

describe('bulk imported transaction classification', () => {
    it('rejects duplicate selections before starting a transaction', async () => {
        const db = { $transaction: vi.fn() };
        await expect(bulkReclassifyTransactions(db, 'owner', ['a', 'a'], null)).rejects.toThrow();
        expect(db.$transaction).not.toHaveBeenCalled();
    });
});
