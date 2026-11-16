import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireCurrentUserId, UnauthorizedError } from '@/lib/auth/require-user';
import { createFinancialGoal, listFinancialGoals } from '@/modules/goals/service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const userId = await requireCurrentUserId();
        const goals = await listFinancialGoals(prisma, userId);
        return Response.json({
            goals: goals.map((goal) => ({
                ...goal,
                targetInCents: goal.targetInCents.toString(),
                savedInCents: goal.savedInCents.toString(),
            })),
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
        const goal = await createFinancialGoal(prisma, userId, await request.json());
        return Response.json({
            goal: {
                ...goal,
                targetInCents: goal.targetInCents.toString(),
                savedInCents: goal.savedInCents.toString(),
            },
        }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
        if (error instanceof UnauthorizedError) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (error instanceof z.ZodError || error instanceof SyntaxError
            || (error instanceof Error && error.message.startsWith('Invalid goal'))) {
            return Response.json({ error: 'Invalid financial goal' }, { status: 400 });
        }
        throw error;
    }
}
