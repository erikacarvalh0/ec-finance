import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    requireCurrentUserId: vi.fn(),
    getCategoryBudgetReport: vi.fn(),
    setCategoryBudget: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({ prisma: {} }));
vi.mock('@/lib/auth/require-user', () => {
    class UnauthorizedError extends Error {}

    return {
        UnauthorizedError,
        requireCurrentUserId: mocks.requireCurrentUserId,
    };
});
vi.mock('@/modules/budgets/service', () => ({
    getCategoryBudgetReport: mocks.getCategoryBudgetReport,
    setCategoryBudget: mocks.setCategoryBudget,
}));

import { UnauthorizedError } from '@/lib/auth/require-user';
import { GET, PUT } from './route';

describe('budget API authorization and output', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('denies unauthenticated budget reads and writes', async () => {
        mocks.requireCurrentUserId.mockRejectedValue(new UnauthorizedError());

        const getResult = await GET(new Request('http://localhost/api/budgets?period=2026-11'));
        const putResult = await PUT(new Request('http://localhost/api/budgets', {
            method: 'PUT', body: '{}',
        }));

        expect(getResult.status).toBe(401);
        expect(putResult.status).toBe(401);
        expect(mocks.getCategoryBudgetReport).not.toHaveBeenCalled();
        expect(mocks.setCategoryBudget).not.toHaveBeenCalled();
    });

    it('serializes exact cent values and scopes budget reads to the session', async () => {
        mocks.requireCurrentUserId.mockResolvedValue('owner-a');
        mocks.getCategoryBudgetReport.mockResolvedValue({
            period: '2026-11',
            categories: [{
                categoryId: 'a',
                name: 'Mercado',
                spentInCents: BigInt(8500),
                limitInCents: BigInt(10000),
                remainingInCents: BigInt(1500),
                percentage: 85,
                status: 'NEAR_LIMIT',
            }],
        });

        const response = await GET(new Request('http://localhost/api/budgets?period=2026-11'));
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(mocks.getCategoryBudgetReport).toHaveBeenCalledWith(
            expect.anything(), 'owner-a', '2026-11',
        );
        expect(payload.categories[0].spentInCents).toBe('8500');
        expect(payload.categories[0].limitInCents).toBe('10000');
    });

    it('serializes persisted rollover amounts when saving a base limit', async () => {
        mocks.requireCurrentUserId.mockResolvedValue('owner-a');
        mocks.setCategoryBudget.mockResolvedValue({
            limitInCents: BigInt(10000), rolloverInCents: BigInt(3000),
            rolloverCapInCents: BigInt(5000),
        });
        const response = await PUT(new Request('http://localhost/api/budgets', {
            method: 'PUT', body: '{}',
        }));
        expect(await response.json()).toEqual({ budget: {
            limitInCents: '10000', rolloverInCents: '3000', rolloverCapInCents: '5000',
        } });
    });

    it('does not allow writing to someone else category', async () => {
        mocks.requireCurrentUserId.mockResolvedValue('owner-a');
        mocks.setCategoryBudget.mockRejectedValue(new Error('Category not found'));
        const response = await PUT(new Request('http://localhost/api/budgets', {
            method: 'PUT',
            body: JSON.stringify({
                categoryId: 'private', period: '2026-11', limitInCents: '500',
            }),
        }));

        expect(response.status).toBe(404);
    });
});
