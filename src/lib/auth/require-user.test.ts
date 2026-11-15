import { beforeEach, describe, expect, it, vi } from 'vitest';
import { auth } from '@/lib/auth';
import {
    requireCurrentUserId,
    UnauthorizedError,
} from './require-user';

vi.mock('@/lib/auth', () => ({
    auth: vi.fn(),
}));

const mockedAuth = vi.mocked(auth);

describe('requireCurrentUserId', () => {
    beforeEach(() => {
        mockedAuth.mockReset();
    });

    it('returns the authenticated user ID', async () => {
        mockedAuth.mockResolvedValue({
            user: {
                id: 'owner-123',
            },
        } as Awaited<ReturnType<typeof auth>>);

        await expect(requireCurrentUserId()).resolves.toBe('owner-123');
    });

    it('rejects an unauthenticated session', async () => {
        mockedAuth.mockResolvedValue(null);

        await expect(requireCurrentUserId()).rejects.toBeInstanceOf(
            UnauthorizedError,
        );
    });

    it('rejects sessions without an ID', async () => {
        mockedAuth.mockResolvedValue({
            user: {
                id: '',
            },
        } as Awaited<ReturnType<typeof auth>>);

        await expect(requireCurrentUserId()).rejects.toBeInstanceOf(
            UnauthorizedError,
        );
    });

    it('rejects whitespace-only session IDs', async () => {
        mockedAuth.mockResolvedValue({
            user: {
                id: '   ',
            },
        } as Awaited<ReturnType<typeof auth>>);

        await expect(requireCurrentUserId()).rejects.toBeInstanceOf(
            UnauthorizedError,
        );
    });
});
