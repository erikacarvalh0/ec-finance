import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    requireCurrentUserId: vi.fn(),
    previewOwnedProviderCardBatch: vi.fn(),
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
vi.mock('@/modules/open-finance/owned-card-preview', () => ({
    previewOwnedProviderCardBatch: mocks.previewOwnedProviderCardBatch,
}));

import { UnauthorizedError } from '@/lib/auth/require-user';
import { POST } from './route';

const payload = {
    connectionId: 'connection-a',
    batch: {
        cardExternalId: 'external-card',
        transactions: [{
            externalId: 'purchase-1', description: 'Coffee',
            amountInCents: '1200', occurredAt: '2026-11-15T12:00:00.000Z',
        }],
    },
};

function request(body: unknown) {
    return new Request('http://localhost/api/open-finance/import-preview', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
}

describe('POST /api/open-finance/import-preview', () => {
    beforeEach(() => {
        mocks.requireCurrentUserId.mockReset().mockResolvedValue('owner-a');
        mocks.previewOwnedProviderCardBatch.mockReset().mockResolvedValue({
            cardId: 'owned-card', transactions: payload.batch.transactions.map((item) => ({
                providerTransactionId: item.externalId, description: item.description,
                amountInCents: item.amountInCents, occurredAt: item.occurredAt,
            })), duplicateExternalIds: [],
        });
    });

    it('requires authentication before resolving provider cards', async () => {
        mocks.requireCurrentUserId.mockRejectedValue(new UnauthorizedError());
        expect((await POST(request(payload))).status).toBe(401);
        expect(mocks.previewOwnedProviderCardBatch).not.toHaveBeenCalled();
    });

    it('uses authenticated ownership and disables caching', async () => {
        const response = await POST(request(payload));
        expect(response.status).toBe(200);
        expect(response.headers.get('Cache-Control')).toBe('no-store');
        expect(mocks.previewOwnedProviderCardBatch).toHaveBeenCalledWith(
            expect.anything(), 'owner-a', 'connection-a', payload.batch,
        );
        expect((await response.json()).cardId).toBe('owned-card');
    });

    it('returns 404 for a provider card outside the owned connection', async () => {
        mocks.previewOwnedProviderCardBatch.mockRejectedValue(new Error('Provider card not found'));
        expect((await POST(request(payload))).status).toBe(404);
    });

    it('rejects malformed requests without accessing provider card data', async () => {
        expect((await POST(request({ batch: payload.batch }))).status).toBe(400);
        expect((await POST(request({ connectionId: '', batch: payload.batch }))).status).toBe(400);
        const invalid = new Request('http://localhost/api/open-finance/import-preview', {
            method: 'POST', body: '{invalid',
        });
        expect((await POST(invalid)).status).toBe(400);
        expect(mocks.previewOwnedProviderCardBatch).not.toHaveBeenCalled();
    });

    it('does not suppress unexpected database errors', async () => {
        mocks.previewOwnedProviderCardBatch.mockRejectedValue(new Error('Database unavailable'));
        await expect(POST(request(payload))).rejects.toThrow('Database unavailable');
    });
});
