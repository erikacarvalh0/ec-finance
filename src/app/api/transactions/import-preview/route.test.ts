import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    requireCurrentUserId: vi.fn(),
    previewCardTransactionImport: vi.fn(),
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
vi.mock('@/modules/transactions/import-preview', () => ({
    previewCardTransactionImport: mocks.previewCardTransactionImport,
}));

import { UnauthorizedError } from '@/lib/auth/require-user';
import { POST } from './route';

const payload = {
    cardId: 'card-a',
    transactions: [{
        providerTransactionId: 'provider-1',
        description: 'Groceries',
        amountInCents: '1250',
        occurredAt: '2026-11-15T12:00:00.000Z',
    }],
};

function request(body: unknown) {
    return new Request('http://localhost/api/transactions/import-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
}

describe('POST /api/transactions/import-preview contract', () => {
    beforeEach(() => {
        mocks.requireCurrentUserId.mockReset().mockResolvedValue('owner-a');
        mocks.previewCardTransactionImport.mockReset().mockResolvedValue({
            toImport: [], duplicates: [], conflicts: [],
        });
    });

    it('requires authentication before previewing', async () => {
        mocks.requireCurrentUserId.mockRejectedValue(new UnauthorizedError());
        const response = await POST(request(payload));
        expect(response.status).toBe(401);
        expect(mocks.previewCardTransactionImport).not.toHaveBeenCalled();
    });

    it('passes the authenticated user and card to the service', async () => {
        const response = await POST(request(payload));
        expect(response.status).toBe(200);
        expect(response.headers.get('Cache-Control')).toBe('no-store');
        expect(mocks.previewCardTransactionImport).toHaveBeenCalledWith(
            expect.anything(), 'owner-a', 'card-a', payload.transactions,
        );
    });

    it('serializes bigint cents in both candidates and existing conflicts', async () => {
        mocks.previewCardTransactionImport.mockResolvedValue({
            toImport: [{
                cardId: 'card-a', providerTransactionId: 'provider-1',
                description: 'Groceries', amountInCents: BigInt(1250),
                occurredAt: new Date('2026-11-15T12:00:00.000Z'),
            }],
            duplicates: [],
            conflicts: [{
                candidate: {
                    cardId: 'card-a', providerTransactionId: 'provider-2',
                    description: 'Lunch', amountInCents: BigInt(2500),
                    occurredAt: new Date('2026-11-15T12:00:00.000Z'),
                },
                existing: {
                    cardId: 'card-a', providerTransactionId: 'provider-2',
                    amountInCents: BigInt(2000),
                },
            }],
        });
        const response = await POST(request(payload));
        const body = await response.json();
        expect(body.toImport[0].amountInCents).toBe('1250');
        expect(body.conflicts[0].candidate.amountInCents).toBe('2500');
        expect(body.conflicts[0].existing.amountInCents).toBe('2000');
    });

    it('returns 404 for an unowned card without leaking data', async () => {
        mocks.previewCardTransactionImport.mockRejectedValue(new Error('Credit card not found'));
        const response = await POST(request(payload));
        expect(response.status).toBe(404);
        expect(await response.json()).toEqual({ error: 'Credit card not found' });
    });

    it('rejects missing card and malformed JSON', async () => {
        expect((await POST(request({ transactions: [] }))).status).toBe(400);
        const malformed = new Request('http://localhost/api/transactions/import-preview', {
            method: 'POST', body: '{invalid',
        });
        expect((await POST(malformed)).status).toBe(400);
        expect(mocks.previewCardTransactionImport).not.toHaveBeenCalled();
    });

    it('does not swallow unexpected database errors', async () => {
        mocks.previewCardTransactionImport.mockRejectedValue(new Error('Database unavailable'));
        await expect(POST(request(payload))).rejects.toThrow('Database unavailable');
    });
});
