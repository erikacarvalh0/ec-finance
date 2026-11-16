import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    requireCurrentUserId: vi.fn(),
    getUserCardInvoice: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({ prisma: {} }));

vi.mock('@/lib/auth/require-user', () => {
    class UnauthorizedError extends Error {}

    return {
        UnauthorizedError,
        requireCurrentUserId: mocks.requireCurrentUserId,
    };
});

vi.mock('@/modules/cards/service', () => ({
    getUserCardInvoice: mocks.getUserCardInvoice,
}));

import { UnauthorizedError } from '@/lib/auth/require-user';
import { GET } from './route';

const context = {
    params: Promise.resolve({ id: 'card-a', period: '2026-11' }),
};

describe('GET /api/cards/[id]/invoices/[period]', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('rejects unauthenticated invoice requests before querying records', async () => {
        mocks.requireCurrentUserId.mockRejectedValue(new UnauthorizedError());

        const response = await GET(new Request('http://localhost'), context);

        expect(response.status).toBe(401);
        expect(mocks.getUserCardInvoice).not.toHaveBeenCalled();
    });

    it('passes the authenticated owner and serializes all monetary values', async () => {
        mocks.requireCurrentUserId.mockResolvedValue('owner-a');
        mocks.getUserCardInvoice.mockResolvedValue({
            period: '2026-11',
            cardId: 'card-a',
            closingDay: 10,
            dueDate: new Date('2026-11-20T00:00:00.000Z'),
            totalInCents: BigInt(1234),
            lines: [{
                id: 'charge-a',
                description: 'Spotify',
                amountInCents: BigInt(1234),
                installmentLabel: null,
                source: 'IMPORTED',
            }],
        });

        const response = await GET(new Request('http://localhost'), context);
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(response.headers.get('Cache-Control')).toBe('no-store');
        expect(mocks.getUserCardInvoice).toHaveBeenCalledWith(
            expect.anything(),
            'owner-a',
            'card-a',
            '2026-11',
        );
        expect(payload.totalInCents).toBe('1234');
        expect(payload.lines[0].amountInCents).toBe('1234');
    });

    it('conceals another user card as not found', async () => {
        mocks.requireCurrentUserId.mockResolvedValue('owner-a');
        mocks.getUserCardInvoice.mockRejectedValue(new Error('Card not found'));

        const response = await GET(new Request('http://localhost'), context);

        expect(response.status).toBe(404);
    });

    it('rejects malformed invoice periods', async () => {
        mocks.requireCurrentUserId.mockResolvedValue('owner-a');
        mocks.getUserCardInvoice.mockRejectedValue(new Error('Invalid invoice period'));

        const response = await GET(new Request('http://localhost'), context);

        expect(response.status).toBe(400);
    });
});
