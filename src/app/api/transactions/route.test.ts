import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    requireCurrentUserId: vi.fn(),
    listUserTransactions: vi.fn(),
    createManualTransaction: vi.fn(),
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

vi.mock('@/modules/transactions/create', () => {
    class MissingOwnedResourceError extends Error {
        constructor(message: string) {
            super(message);
            this.name = 'MissingOwnedResourceError';
        }
    }

    return {
        createManualTransaction: mocks.createManualTransaction,
        MissingOwnedResourceError,
    };
});

import { UnauthorizedError } from '@/lib/auth/require-user';
import { MissingOwnedResourceError } from '@/modules/transactions/create';
import { GET, POST } from './route';

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
                amountInCents: BigInt(12345),
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

describe('POST /api/transactions', () => {
    const payload = {
        cardId: 'card-a',
        description: 'Groceries',
        amountInCents: '1250',
        occurredAt: '2026-11-15T12:00:00.000Z',
    };

    function request(body: unknown) {
        return new Request('http://localhost/api/transactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
    }

    beforeEach(() => {
        mocks.requireCurrentUserId.mockReset();
        mocks.createManualTransaction.mockReset();
    });

    it('rejects unauthenticated users before creating transactions', async () => {
        mocks.requireCurrentUserId.mockRejectedValue(new UnauthorizedError());

        const response = await POST(request(payload));

        expect(response.status).toBe(401);
        expect(mocks.createManualTransaction).not.toHaveBeenCalled();
    });

    it('rejects invalid financial amounts', async () => {
        mocks.requireCurrentUserId.mockResolvedValue('owner-a');

        const response = await POST(request({
            ...payload,
            amountInCents: '-250',
        }));

        expect(response.status).toBe(400);
        expect(mocks.createManualTransaction).not.toHaveBeenCalled();
    });

    it('creates a transaction for the session owner and serializes cents', async () => {
        mocks.requireCurrentUserId.mockResolvedValue('owner-a');
        mocks.createManualTransaction.mockResolvedValue({
            id: 'new-transaction',
            amountInCents: BigInt(1250),
        });

        const response = await POST(request(payload));

        expect(response.status).toBe(201);
        expect(mocks.createManualTransaction).toHaveBeenCalledWith(
            expect.anything(),
            'owner-a',
            payload,
        );
        expect(await response.json()).toEqual({
            transaction: {
                id: 'new-transaction',
                amountInCents: '1250',
            },
        });
    });

    it('does not reveal another user card or category', async () => {
        mocks.requireCurrentUserId.mockResolvedValue('owner-a');
        mocks.createManualTransaction.mockRejectedValue(
            new MissingOwnedResourceError('Credit card not found'),
        );

        const response = await POST(request(payload));

        expect(response.status).toBe(404);
        expect(await response.json()).toEqual({
            error: 'Credit card not found',
        });
    });

    it('rejects malformed request JSON', async () => {
        mocks.requireCurrentUserId.mockResolvedValue('owner-a');
        const malformed = new Request('http://localhost/api/transactions', {
            method: 'POST',
            body: '{invalid-json',
        });

        const response = await POST(malformed);

        expect(response.status).toBe(400);
        expect(mocks.createManualTransaction).not.toHaveBeenCalled();
    });

    it('surfaces unexpected failures', async () => {
        mocks.requireCurrentUserId.mockResolvedValue('owner-a');
        mocks.createManualTransaction.mockRejectedValue(new Error('Database unavailable'));

        await expect(POST(request(payload))).rejects.toThrow('Database unavailable');
    });
});
