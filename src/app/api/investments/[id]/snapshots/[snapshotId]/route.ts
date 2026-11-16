import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireCurrentUserId, UnauthorizedError } from '@/lib/auth/require-user';
import {
    correctInvestmentSnapshot,
    deleteInvestmentSnapshot,
} from '@/modules/investments/snapshot-corrections';

export const runtime = 'nodejs';

type Params = { params: Promise<{ id: string; snapshotId: string }> };

function handleError(error: unknown): Response {
    if (error instanceof UnauthorizedError) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (error instanceof Error && (
        error.message === 'Investment not found'
        || error.message === 'Snapshot not found'
    )) {
        return Response.json({ error: 'Snapshot not found' }, { status: 404 });
    }

    if (error instanceof z.ZodError || error instanceof SyntaxError
        || (error instanceof Error && error.message === 'Amount exceeds the supported range')) {
        return Response.json({ error: 'Invalid valuation' }, { status: 400 });
    }

    throw error;
}

export async function PATCH(request: Request, { params }: Params) {
    try {
        const userId = await requireCurrentUserId();
        const { id, snapshotId } = await params;

        const snapshot = await correctInvestmentSnapshot(
            prisma, userId, id, snapshotId, await request.json(),
        );

        return Response.json({
            snapshot: {
                id: snapshot.id,
                amountInCents: snapshot.amountInCents.toString(),
                recordedAt: snapshot.recordedAt.toISOString().slice(0, 10),
            },
        }, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
        return handleError(error);
    }
}

export async function DELETE(_request: Request, { params }: Params) {
    try {
        const userId = await requireCurrentUserId();
        const { id, snapshotId } = await params;
        await deleteInvestmentSnapshot(prisma, userId, id, snapshotId);

        return new Response(null, { status: 204 });
    } catch (error) {
        return handleError(error);
    }
}
