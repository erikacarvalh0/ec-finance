import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';

const mocks = vi.hoisted(() => ({
    requireCurrentUserId: vi.fn(),
    listCategories: vi.fn(),
    createCategory: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
    prisma: {
        category: {},
    },
}));

vi.mock('@/lib/auth/require-user', () => {
    class UnauthorizedError extends Error {
        constructor() {
            super('Authentication required');
            this.name = 'UnauthorizedError';
        }
    }

    return {
        UnauthorizedError,
        requireCurrentUserId: mocks.requireCurrentUserId,
    };
});

vi.mock('@/modules/categories/service', () => ({
    listCategories: mocks.listCategories,
    createCategory: mocks.createCategory,
}));

import { UnauthorizedError } from '@/lib/auth/require-user';
import { GET, POST } from './route';

describe('/api/categories', () => {
    function post(body: string) {
        return new Request('http://localhost/api/categories', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body,
        });
    }

    beforeEach(() => {
        mocks.requireCurrentUserId.mockReset();
        mocks.listCategories.mockReset();
        mocks.createCategory.mockReset();
    });

    it('denies unauthenticated reads without querying the database', async () => {
        mocks.requireCurrentUserId.mockRejectedValue(new UnauthorizedError());

        const response = await GET();

        expect(response.status).toBe(401);
        expect(mocks.listCategories).not.toHaveBeenCalled();
    });

    it('only lists categories for the session owner', async () => {
        mocks.requireCurrentUserId.mockResolvedValue('owner-a');
        mocks.listCategories.mockResolvedValue([{ id: 'category-a', name: 'Groceries' }]);

        const response = await GET();

        expect(response.status).toBe(200);
        expect(response.headers.get('Cache-Control')).toBe('no-store');
        expect(mocks.listCategories).toHaveBeenCalledWith(expect.anything(), 'owner-a');
        expect(await response.json()).toEqual({
            categories: [{ id: 'category-a', name: 'Groceries' }],
        });
    });

    it('creates a category for the authenticated user', async () => {
        mocks.requireCurrentUserId.mockResolvedValue('owner-a');
        mocks.createCategory.mockResolvedValue({ id: 'category-a', name: 'Groceries' });

        const response = await POST(post(JSON.stringify({ name: 'Groceries' })));

        expect(response.status).toBe(201);
        expect(mocks.createCategory).toHaveBeenCalledWith(
            expect.anything(),
            'owner-a',
            'Groceries',
        );
    });

    it('rejects unauthenticated writes', async () => {
        mocks.requireCurrentUserId.mockRejectedValue(new UnauthorizedError());

        const response = await POST(post(JSON.stringify({ name: 'Groceries' })));

        expect(response.status).toBe(401);
        expect(mocks.createCategory).not.toHaveBeenCalled();
    });

    it('rejects invalid payloads and malformed JSON', async () => {
        mocks.requireCurrentUserId.mockResolvedValue('owner-a');

        expect((await POST(post(JSON.stringify({ name: '' })))).status).toBe(400);
        expect((await POST(post('{invalid-json'))).status).toBe(400);
        expect(mocks.createCategory).not.toHaveBeenCalled();
    });

    it('rejects whitespace-only names after service validation', async () => {
        mocks.requireCurrentUserId.mockResolvedValue('owner-a');
        mocks.createCategory.mockRejectedValue(
            new Error('Category name must contain between 1 and 100 characters'),
        );

        const response = await POST(post(JSON.stringify({ name: ' ' })));

        expect(response.status).toBe(400);
    });

    it('returns conflict for duplicate categories', async () => {
        mocks.requireCurrentUserId.mockResolvedValue('owner-a');
        mocks.createCategory.mockRejectedValue(
            new Prisma.PrismaClientKnownRequestError('Unique constraint violation', {
                code: 'P2002',
                clientVersion: '6.0.0',
            }),
        );

        const response = await POST(post(JSON.stringify({ name: 'Groceries' })));

        expect(response.status).toBe(409);
    });
});
