import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireCurrentUserId, UnauthorizedError } from '@/lib/auth/require-user';
import { configureCardCycle } from '@/modules/cards/service';

export const runtime = 'nodejs';

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const userId = await requireCurrentUserId();
        const { id } = await params;
        const card = await configureCardCycle(prisma, userId, id, await request.json());

        return Response.json({ card }, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
        if (error instanceof UnauthorizedError) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (error instanceof Error && error.message === 'Card not found') {
            return Response.json({ error: 'Card not found' }, { status: 404 });
        }

        if (error instanceof z.ZodError || error instanceof SyntaxError) {
            return Response.json({ error: 'Invalid billing cycle' }, { status: 400 });
        }

        throw error;
    }
}
