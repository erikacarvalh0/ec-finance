import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireCurrentUserId, UnauthorizedError } from '@/lib/auth/require-user';
import { configureCardLimit, getCardLimitOverview } from '@/modules/cards/limits';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function errorResponse(error: unknown) {
    if (error instanceof UnauthorizedError) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'Card not found') {
        return Response.json({ error: 'Card not found' }, { status: 404 });
    }
    if (error instanceof z.ZodError || error instanceof SyntaxError
        || (error instanceof Error && error.message === 'Card limit exceeds supported range')) {
        return Response.json({ error: 'Invalid card limit' }, { status: 400 });
    }
    throw error;
}
type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
    try {
        const userId = await requireCurrentUserId();
        const { id } = await params;
        const estimate = await getCardLimitOverview(prisma, userId, id);
        return Response.json({
            estimate: estimate && {
                ...estimate,
                creditLimitInCents: estimate.creditLimitInCents.toString(),
                estimatedUsedInCents: estimate.estimatedUsedInCents.toString(),
                estimatedAvailableInCents: estimate.estimatedAvailableInCents.toString(),
            },
        }, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
        return errorResponse(error);
    }
}

export async function PATCH(request: Request, { params }: Context) {
    try {
        const userId = await requireCurrentUserId();
        const { id } = await params;
        const card = await configureCardLimit(prisma, userId, id, await request.json());
        return Response.json({
            creditLimitInCents: card.creditLimitInCents?.toString() ?? null,
        }, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
        return errorResponse(error);
    }
}
