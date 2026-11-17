import { describe, expect, it, vi } from 'vitest';
import { requireCurrentUserId, UnauthorizedError } from '@/lib/auth/require-user';
import { POST } from './route';

vi.mock('@/lib/auth/require-user', () => ({
    requireCurrentUserId: vi.fn(),
    UnauthorizedError: class UnauthorizedError extends Error {},
}));
vi.mock('@/lib/prisma', () => ({ prisma: {} }));
vi.mock('@/modules/expenses/bulk-category', () => ({ bulkReclassifyExpenses: vi.fn() }));

describe('bulk category authorization', () => {
    it.each([true, false])('rejects anonymous preview=%s', async preview => {
        vi.mocked(requireCurrentUserId).mockRejectedValue(new UnauthorizedError());
        const response = await POST(new Request('http://localhost/api/expenses/bulk-category', {
            method: 'POST',
            body: JSON.stringify({ ids: ['private'], categoryId: null, preview }),
        }));
        expect(response.status).toBe(401);
    });
});
