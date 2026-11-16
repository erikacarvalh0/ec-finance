import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireCurrentUserId, UnauthorizedError } from '@/lib/auth/require-user';
import { createManualCard, listUserCards } from '@/modules/cards/service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const userId = await requireCurrentUserId();

        return Response.json({
            cards: await listUserCards(prisma, userId),
        }, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
        if (error instanceof UnauthorizedError) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        throw error;
    }
}

export async function POST(request: Request) {
    try {
        const userId = await requireCurrentUserId();
        const card = await createManualCard(prisma, userId, await request.json());

        return Response.json({ card }, { status: 201 });
    } catch (error) {
        if (error instanceof UnauthorizedError) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (error instanceof z.ZodError || error instanceof SyntaxError) {
            return Response.json({ error: 'Invalid card details' }, { status: 400 });
        }

        throw error;
    }
}
