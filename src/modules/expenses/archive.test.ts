import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setExpenseArchived } from './archive';

const updateMany = vi.fn();
const database = { expense: { updateMany } } as unknown as Parameters<typeof setExpenseArchived>[0];

describe('expenses archive and restore', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        updateMany.mockResolvedValue({ count: 1 });
    });

    it('archives only the authenticated owner record', async () => {
        await expect(setExpenseArchived(database, 'owner-a', 'record-a', true))
            .resolves.toBe(true);
        expect(updateMany).toHaveBeenCalledWith({
            where: { id: 'record-a', userId: 'owner-a', archivedAt: null },
            data: { archivedAt: expect.any(Date) },
        });
    });

    it('restores only a previously archived owner record', async () => {
        await expect(setExpenseArchived(database, 'owner-a', 'record-a', false))
            .resolves.toBe(true);
        expect(updateMany).toHaveBeenCalledWith({
            where: { id: 'record-a', userId: 'owner-a', archivedAt: { not: null } },
            data: { archivedAt: null },
        });
    });

    it('does not disclose missing or other-user records', async () => {
        updateMany.mockResolvedValue({ count: 0 });
        await expect(setExpenseArchived(database, 'owner-a', 'missing', true))
            .resolves.toBe(false);
    });

    it('rejects anonymous users and blank record identifiers', async () => {
        await expect(setExpenseArchived(database, ' ', 'record-a', true)).rejects.toThrow();
        await expect(setExpenseArchived(database, 'owner-a', ' ', true)).rejects.toThrow();
        expect(updateMany).not.toHaveBeenCalled();
    });
});
