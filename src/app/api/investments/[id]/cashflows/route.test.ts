import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    requireCurrentUserId: vi.fn(),
    recordInvestmentCashflow: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({ prisma: {} }));

vi.mock('@/lib/auth/require-user', () => {
    class UnauthorizedError extends Error {}
    return {
        UnauthorizedError,
        requireCurrentUserId: mocks.requireCurrentUserId,
    };
});

vi.mock('@/modules/investments/cashflows', () => ({
    recordInvestmentCashflow: mocks.recordInvestmentCashflow,
}));

import { UnauthorizedError } from '@/lib/auth/require-user';
import { POST } from './route';

const context = { params: Promise.resolve({ id: 'investment-a' }) };

function request(body: unknown) {
    return new Request('http://localhost/api/investments/investment-a/cashflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
}

describe('investment cashflow API', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('rejects unauthenticated requests without writing', async () => {
        mocks.requireCurrentUserId.mockRejectedValue(new UnauthorizedError());

        const response = await POST(request({}), context);
        expect(response.status).toBe(401);
        expect(mocks.recordInvestmentCashflow).not.toHaveBeenCalled();
    });

    it('derives the owner server-side and serializes BigInt amounts', async () => {
        mocks.requireCurrentUserId.mockResolvedValue('owner-a');
        mocks.recordInvestmentCashflow.mockResolvedValue({
            id: 'cashflow-a',
            type: 'DEPOSIT',
            amountInCents: BigInt(12005),
            occurredAt: new Date('2026-11-15T00:00:00.000Z'),
        });

        const response = await POST(request({
            type: 'DEPOSIT',
            amountInCents: '12005',
            occurredAt: '2026-11-15',
            userId: 'malicious-owner',
        }), context);

        expect(response.status).toBe(201);
        expect(mocks.recordInvestmentCashflow).toHaveBeenCalledWith(
            expect.anything(),
            'owner-a',
            'investment-a',
            expect.objectContaining({ userId: 'malicious-owner' }),
        );
        expect((await response.json()).cashflow.amountInCents).toBe('12005');
    });

    it('conceals cross-user investment IDs as not found', async () => {
        mocks.requireCurrentUserId.mockResolvedValue('owner-a');
        mocks.recordInvestmentCashflow.mockRejectedValue(new Error('Investment not found'));

        expect((await POST(request({}), context)).status).toBe(404);
    });

    it('rejects malformed JSON', async () => {
        mocks.requireCurrentUserId.mockResolvedValue('owner-a');

        const request = new Request('http://localhost/api/investments/investment-a/cashflows', {
            method: 'POST',
            body: '{broken',
        });

        expect((await POST(request, context)).status).toBe(400);
    });
});
