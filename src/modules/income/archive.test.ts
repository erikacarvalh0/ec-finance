import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setIncomeArchived } from './archive';

const updateMany = vi.fn();
const database = { income: { updateMany } } as unknown as Parameters<typeof setIncomeArchived>[0];

describe('income archive and restore', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        updateMany.mockResolvedValue({ count: 1 });
    });

    it('archives only the authenticated owner record', async () => {
        await expect(setIncomeArchived(database, 'owner-a', 'record-a', true))
            .resolves.toBe(true);
        expect(updateMany).toHaveBeenCalledWith({
            where: { id: 'record-a', userId: 'owner-a', archivedAt: null },
            data: { archivedAt: expect.any(Date) },
        });
    });

    it('restores only a previously archived owner record', async () => {
        await expect(setIncomeArchived(database, 'owner-a', 'record-a', false))
            .resolves.toBe(true);
        expect(updateMany).toHaveBeenCalledWith({
            where: { id: 'record-a', userId: 'owner-a', archivedAt: { not: null } },
            data: { archivedAt: null },
        });
    });

    it('does not disclose missing or other-user records', async () => {
        updateMany.mockResolvedValue({ count: 0 });
        await expect(setIncomeArchived(database, 'owner-a', 'missing', true))
            .resolves.toBe(false);
    });

    it('rejects anonymous users and blank record identifiers', async () => {
        await expect(setIncomeArchived(database, ' ', 'record-a', true)).rejects.toThrow();
        await expect(setIncomeArchived(database, 'owner-a', ' ', true)).rejects.toThrow();
        expect(updateMany).not.toHaveBeenCalled();
    });
});
