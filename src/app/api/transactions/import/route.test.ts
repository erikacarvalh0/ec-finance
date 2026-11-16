import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    requireCurrentUserId: vi.fn(),
    importCardTransactions: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({ prisma: {} }));
vi.mock('@/lib/auth/require-user', () => {
    class UnauthorizedError extends Error {
        constructor() {
            super('Authentication required');
            this.name = 'UnauthorizedError';
        }
    }
    return { requireCurrentUserId: mocks.requireCurrentUserId, UnauthorizedError };
});
vi.mock('@/modules/transactions/import', () => ({
    importCardTransactions: mocks.importCardTransactions,
}));

import { UnauthorizedError } from '@/lib/auth/require-user';
import { POST } from './route';

const payload = {
    cardId: 'card-a',
    transactions: [{
        providerTransactionId: 'purchase-1',
        description: 'Groceries',
        amountInCents: '1250',
        occurredAt: '2026-11-15T12:00:00.000Z',
    }],
};

function request(body: unknown) {
    return new Request('http://localhost/api/transactions/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
}

describe('POST /api/transactions/import', () => {
    beforeEach(() => {
        mocks.requireCurrentUserId.mockReset().mockResolvedValue('owner-a');
        mocks.importCardTransactions.mockReset().mockResolvedValue({
            importedCount: 1, duplicateCount: 0,
        });
    });

    it('requires authentication before importing', async () => {
        mocks.requireCurrentUserId.mockRejectedValue(new UnauthorizedError());
        const response = await POST(request(payload));
        expect(response.status).toBe(401);
        expect(mocks.importCardTransactions).not.toHaveBeenCalled();
    });

    it('uses the session owner and disables response caching', async () => {
        const response = await POST(request(payload));
        expect(response.status).toBe(200);
        expect(response.headers.get('Cache-Control')).toBe('no-store');
        expect(await response.json()).toEqual({
            importedCount: 1, duplicateCount: 0,
        });
        expect(mocks.importCardTransactions).toHaveBeenCalledWith(
            expect.anything(), 'owner-a', 'card-a', payload.transactions,
        );
    });

    it('returns 404 when the card is not owned', async () => {
        mocks.importCardTransactions.mockRejectedValue(new Error('Credit card not found'));
        const response = await POST(request(payload));
        expect(response.status).toBe(404);
        expect(await response.json()).toEqual({ error: 'Credit card not found' });
    });

    it('returns 409 on conflicting imported transactions', async () => {
        mocks.importCardTransactions.mockRejectedValue(
            new Error('Conflicting imported transactions'),
        );
        const response = await POST(request(payload));
        expect(response.status).toBe(409);
        expect(await response.json()).toEqual({
            error: 'Conflicting imported transactions',
        });
    });

    it('rejects missing card and malformed JSON without writing', async () => {
        expect((await POST(request({ transactions: [] }))).status).toBe(400);
        const malformed = new Request('http://localhost/api/transactions/import', {
            method: 'POST', body: '{invalid',
        });
        expect((await POST(malformed)).status).toBe(400);
        expect(mocks.importCardTransactions).not.toHaveBeenCalled();
    });

    it('does not swallow unexpected database failures', async () => {
        mocks.importCardTransactions.mockRejectedValue(new Error('Database unavailable'));
        await expect(POST(request(payload))).rejects.toThrow('Database unavailable');
    });
});
