import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireCurrentUserId, UnauthorizedError } from '@/lib/auth/require-user';
import { applyBudgetRollover } from '@/modules/budgets/rollover';

export const runtime = 'nodejs';

export async function POST(request: Request) {
    try {
        const userId = await requireCurrentUserId();
        const result = await applyBudgetRollover(prisma, userId, await request.json());
        return Response.json(result, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
        if (error instanceof UnauthorizedError) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (error instanceof Error && error.message === 'Budget not found') {
            return Response.json({ error: error.message }, { status: 404 });
        }
        if (error instanceof z.ZodError || error instanceof SyntaxError
            || (error instanceof Error && error.message === 'Invalid budget period')) {
            return Response.json({ error: 'Invalid rollover request' }, { status: 400 });
        }
        throw error;
    }
}
