import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireCurrentUserId, UnauthorizedError } from '@/lib/auth/require-user';
import { listGoalMovements, recordGoalMovement } from '@/modules/goals/movements';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const userId = await requireCurrentUserId();
        const { id } = await context.params;
        const movements = await listGoalMovements(prisma, userId, id);
        return Response.json({
            movements: movements.map((movement) => ({
                ...movement, amountInCents: movement.amountInCents.toString(),
            })),
        }, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
        if (error instanceof UnauthorizedError) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (error instanceof Error && error.message === 'Goal not found') {
            return Response.json({ error: 'Goal not found' }, { status: 404 });
        }
        throw error;
    }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const userId = await requireCurrentUserId();
        const { id } = await context.params;
        const movement = await recordGoalMovement(prisma, userId, id, await request.json());
        return Response.json({
            movement: { ...movement, amountInCents: movement.amountInCents.toString() },
        }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
        if (error instanceof UnauthorizedError) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (error instanceof Error && error.message === 'Goal not found or insufficient balance') {
            return Response.json({ error: error.message }, { status: 409 });
        }
        if (error instanceof z.ZodError || error instanceof SyntaxError
            || (error instanceof Error && error.message === 'Invalid goal movement amount')) {
            return Response.json({ error: 'Invalid goal movement' }, { status: 400 });
        }
        throw error;
    }
}
