import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireCurrentUserId, UnauthorizedError } from '@/lib/auth/require-user';
import { recordInvestmentCashflow } from '@/modules/investments/cashflows';

export const runtime = 'nodejs';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const userId = await requireCurrentUserId();
        const { id } = await params;
        const cashflow = await recordInvestmentCashflow(
            prisma, userId, id, await request.json(),
        );

        return Response.json({
            cashflow: {
                id: cashflow.id,
                type: cashflow.type,
                amountInCents: cashflow.amountInCents.toString(),
                occurredAt: cashflow.occurredAt.toISOString().slice(0, 10),
            },
        }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
        if (error instanceof UnauthorizedError) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (error instanceof Error && error.message === 'Investment not found') {
            return Response.json({ error: 'Investment not found' }, { status: 404 });
        }
        if (error instanceof SyntaxError || error instanceof z.ZodError
            || (error instanceof Error && error.message === 'Amount exceeds the supported range')) {
            return Response.json({ error: 'Invalid investment cashflow' }, { status: 400 });
        }
        throw error;
    }
}
