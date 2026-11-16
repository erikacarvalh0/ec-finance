import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ user: vi.fn(), apply: vi.fn() }));
vi.mock('@/lib/prisma', () => ({ prisma: {} }));
vi.mock('@/lib/auth/require-user', () => ({
    requireCurrentUserId: mocks.user,
    UnauthorizedError: class UnauthorizedError extends Error {},
}));
vi.mock('@/modules/budgets/rollover', () => ({ applyBudgetRollover: mocks.apply }));
import { UnauthorizedError } from '@/lib/auth/require-user';
import { POST } from './route';

const input = { categoryId: 'food', period: '2027-01', capInCents: '3000' };
const request = () => new Request('http://localhost/api/budgets/rollover', {
    method: 'POST', body: JSON.stringify(input),
});

describe('budget rollover API', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        mocks.user.mockResolvedValue('owner');
    });

    it('requires authentication before applying rollover', async () => {
        mocks.user.mockRejectedValue(new UnauthorizedError());
        expect((await POST(request())).status).toBe(401);
        expect(mocks.apply).not.toHaveBeenCalled();
    });

    it('uses the session owner and returns whether an application occurred', async () => {
        mocks.apply.mockResolvedValue({ applied: false, sourcePeriod: '2026-12', targetPeriod: '2027-01' });
        const response = await POST(request());
        expect(response.status).toBe(200);
        expect(response.headers.get('Cache-Control')).toBe('no-store');
        expect(await response.json()).toMatchObject({ applied: false });
        expect(mocks.apply).toHaveBeenCalledWith({}, 'owner', input);
    });

    it('returns 404 for missing or foreign targets and 400 for malformed JSON', async () => {
        mocks.apply.mockRejectedValue(new Error('Budget not found'));
        expect((await POST(request())).status).toBe(404);
        expect((await POST(new Request('http://localhost/api/budgets/rollover', {
            method: 'POST', body: '{',
        }))).status).toBe(400);
    });
});
