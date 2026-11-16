import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireCurrentUserId, UnauthorizedError } from '@/lib/auth/require-user';
import { copyPreviousMonthBudgets } from '@/modules/budgets/copy-previous';

export const runtime = 'nodejs';
const schema = z.object({
    targetPeriod: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
});

export async function POST(request: Request) {
    try {
        const userId = await requireCurrentUserId();
        const input = schema.parse(await request.json());
        const result = await copyPreviousMonthBudgets(prisma, userId, input.targetPeriod);
        return Response.json(result, {
            headers: { 'Cache-Control': 'no-store' },
        });
    } catch (error) {
        if (error instanceof UnauthorizedError) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (error instanceof z.ZodError || error instanceof SyntaxError
            || (error instanceof Error && error.message === 'Invalid budget period')) {
            return Response.json({ error: 'Invalid budget period' }, { status: 400 });
        }
        throw error;
    }
}
