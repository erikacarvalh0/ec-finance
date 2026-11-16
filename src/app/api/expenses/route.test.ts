import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    requireCurrentUserId: vi.fn(),
    createExpense: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({ prisma: { expense: {} } }));

vi.mock('@/lib/auth/require-user', () => ({
    requireCurrentUserId: mocks.requireCurrentUserId,
    UnauthorizedError: class extends Error {},
}));

vi.mock('@/modules/finance/service', () => ({
    createExpense: mocks.createExpense,
    listExpenses: vi.fn(),
}));

import { POST } from './route';

describe('POST /api/expenses missing resources', () => {
    beforeEach(() => {
        mocks.requireCurrentUserId.mockReset();
        mocks.createExpense.mockReset();
        mocks.requireCurrentUserId.mockResolvedValue('owner-a');
    });

    it.each(['Category not found', 'Card not found'])(
        'returns the matching 404 error for %s',
        async (message) => {
            mocks.createExpense.mockRejectedValue(new Error(message));
            const request = new Request('http://localhost/api/expenses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ description: 'Groceries', amountInCents: '1250' }),
            });

            const response = await POST(request);

            expect(response.status).toBe(404);
            expect(await response.json()).toEqual({ error: message });
        },
    );
});
