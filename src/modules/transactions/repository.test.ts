import { beforeEach, describe, expect, it, vi } from 'vitest';
import { listUserTransactions } from './repository';

const findMany = vi.fn();

const database = {
    transaction: {
        findMany,
    },
} as unknown as Parameters<typeof listUserTransactions>[0];

describe('listUserTransactions', () => {
    beforeEach(() => {
        findMany.mockReset();
        findMany.mockResolvedValue([]);
    });

    it('restricts every query to the authenticated user', async () => {
        await listUserTransactions(database, 'owner-123');

        expect(findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: {
                    userId: 'owner-123',
                },
            }),
        );
    });

    it('returns newest transactions first with a bounded result size', async () => {
        await listUserTransactions(database, 'owner-123');

        expect(findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                orderBy: {
                    occurredAt: 'desc',
                },
                take: 50,
            }),
        );
    });

    it.each(['', '   '])('rejects invalid authenticated IDs (%j)', async (id) => {
        await expect(listUserTransactions(database, id)).rejects.toThrow(
            'Authenticated user ID is required',
        );

        expect(findMany).not.toHaveBeenCalled();
    });

    it('does not return sensitive provider fields', async () => {
        await listUserTransactions(database, 'owner-123');

        expect(findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                select: {
                    id: true,
                    description: true,
                    amountInCents: true,
                    occurredAt: true,
                    categoryId: true,
                },
            }),
        );
    });
});
