import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireCurrentUserId, UnauthorizedError } from '@/lib/auth/require-user';
import { previewOwnedProviderCardBatch } from '@/modules/open-finance/owned-card-preview';
import type { ProviderCardBatch } from '@/modules/open-finance/adapter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const userId = await requireCurrentUserId();
        const body: unknown = await request.json();
        if (!body || typeof body !== 'object' || Array.isArray(body)
            || !('connectionId' in body) || !('batch' in body)
            || typeof body.connectionId !== 'string' || !body.connectionId.trim()
            || !body.batch || typeof body.batch !== 'object' || Array.isArray(body.batch)) {
            return Response.json({ error: 'Invalid provider preview' }, { status: 400 });
        }

        const result = await previewOwnedProviderCardBatch(
            prisma, userId, body.connectionId, body.batch as ProviderCardBatch,
        );
        return Response.json(result, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
        if (error instanceof UnauthorizedError) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (error instanceof Error && error.message === 'Provider card not found') {
            return Response.json({ error: 'Provider card not found' }, { status: 404 });
        }
        if (error instanceof z.ZodError || error instanceof SyntaxError
            || (error instanceof Error && error.message === 'Provider transaction amount is out of range')) {
            return Response.json({ error: 'Invalid provider preview' }, { status: 400 });
        }
        throw error;
    }
}
