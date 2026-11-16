import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    requireCurrentUserId: vi.fn(),
    updateForecastOccurrence: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({ prisma: {} }));

vi.mock('@/lib/auth/require-user', () => {
    class UnauthorizedError extends Error {}

    return {
        requireCurrentUserId: mocks.requireCurrentUserId,
        UnauthorizedError,
    };
});

vi.mock('@/modules/forecast/occurrences', () => ({
    updateForecastOccurrence: mocks.updateForecastOccurrence,
}));

import { UnauthorizedError } from '@/lib/auth/require-user';
import { PATCH } from './route';

const context = {
    params: Promise.resolve({ kind: 'expense', id: 'expense-a' }),
};

function request(body: unknown) {
    return new Request('http://localhost/api/forecast/expense/expense-a', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
}

describe('PATCH /api/forecast/[kind]/[id]', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('rejects unauthenticated calls before changing records', async () => {
        mocks.requireCurrentUserId.mockRejectedValue(new UnauthorizedError());

        const response = await PATCH(request({
            month: '2027-01',
            status: 'SETTLED',
        }), context);

        expect(response.status).toBe(401);
        expect(mocks.updateForecastOccurrence).not.toHaveBeenCalled();
    });

    it('passes only the server-authenticated owner into the domain service', async () => {
        mocks.requireCurrentUserId.mockResolvedValue('owner-a');
        mocks.updateForecastOccurrence.mockResolvedValue({
            id: 'occurrence-a',
            status: 'SETTLED',
            actualAmountInCents: BigInt(1000),
        });

        const response = await PATCH(request({
            month: '2027-01',
            status: 'SETTLED',
            actualAmountInCents: '1000',
            userId: 'attacker-controlled',
        }), context);

        expect(response.status).toBe(200);
        expect(mocks.updateForecastOccurrence).toHaveBeenCalledWith(
            expect.anything(),
            'owner-a',
            'expense',
            'expense-a',
            expect.objectContaining({ userId: 'attacker-controlled' }),
        );
        expect((await response.json()).occurrence.actualAmountInCents)
            .toBe('1000');
    });

    it('rejects malformed payloads', async () => {
        mocks.requireCurrentUserId.mockResolvedValue('owner-a');
        const response = await PATCH(new Request(
            'http://localhost/api/forecast/expense/expense-a',
            { method: 'PATCH', body: '{invalid' },
        ), context);

        expect(response.status).toBe(400);
    });

    it('responds with 404 for a foreign user occurrence', async () => {
        mocks.requireCurrentUserId.mockResolvedValue('owner-a');
        mocks.updateForecastOccurrence.mockRejectedValue(
            new Error('Forecast source not found'),
        );

        const response = await PATCH(request({
            month: '2027-01',
            status: 'SETTLED',
        }), context);

        expect(response.status).toBe(404);
    });

    it('returns 400 for an invalid occurrence kind', async () => {
        mocks.requireCurrentUserId.mockResolvedValue('owner-a');
        const response = await PATCH(request({
            month: '2027-01',
            status: 'SETTLED',
        }), {
            params: Promise.resolve({ kind: 'unknown', id: 'expense-a' }),
        });

        expect(response.status).toBe(400);
        expect(mocks.updateForecastOccurrence).not.toHaveBeenCalled();
    });
});
