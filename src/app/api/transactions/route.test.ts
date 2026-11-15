import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    requireCurrentUserId: vi.fn(),
    listUserTransactions: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
    prisma: {
        transaction: {},
    },
}));

vi.mock('@/lib/auth/require-user', () => {
    class UnauthorizedError extends Error {
        constructor() {
            super('Authentication required');
            this.name = 'UnauthorizedError';
        }
    }

    return {
        requireCurrentUserId: mocks.requireCurrentUserId,
        UnauthorizedError,
    };
});

vi.mock('@/modules/transactions/repository', () => ({
    listUserTransactions: mocks.listUserTransactions,
}));

import { UnauthorizedError } from '@/lib/auth/require-user';
import { GET } from './route';

describe('GET /api/transactions', () => {
    beforeEach(() => {
        mocks.requireCurrentUserId.mockReset();
        mocks.listUserTransactions.mockReset();
    });

    it('rejects unauthenticated requests without querying transactions', async () => {
        mocks.requireCurrentUserId.mockRejectedValue(new UnauthorizedError());

        const response = await GET();

        expect(response.status).toBe(401);
        expect(await response.json()).toEqual({
            error: 'Unauthorized',
        });
        expect(mocks.listUserTransactions).not.toHaveBeenCalled();
    });

    it('returns scoped transactions with JSON-safe amounts and disables caching', async () => {
        mocks.requireCurrentUserId.mockResolvedValue('owner-123');
        mocks.listUserTransactions.mockResolvedValue([
            {
                id: 'transaction-1',
                description: 'Groceries',
                amountInCents: 12345n,
                occurredAt: new Date('2026-11-15T12:00:00.000Z'),
                categoryId: null,
            },
        ]);

        const response = await GET();

        expect(response.status).toBe(200);
        expect(response.headers.get('Cache-Control')).toBe('no-store');
        expect(mocks.listUserTransactions).toHaveBeenCalledWith(
            expect.anything(),
            'owner-123',
        );
        expect(await response.json()).toEqual({
            transactions: [
                {
                    id: 'transaction-1',
                    description: 'Groceries',
                    amountInCents: '12345',
                    occurredAt: '2026-11-15T12:00:00.000Z',
                    categoryId: null,
                },
            ],
        });
    });

    it('does not swallow unexpected database failures', async () => {
        mocks.requireCurrentUserId.mockResolvedValue('owner-123');
        mocks.listUserTransactions.mockRejectedValue(new Error('Database unavailable'));

        await expect(GET()).rejects.toThrow('Database unavailable');
    });
});
