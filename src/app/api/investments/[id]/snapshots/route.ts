import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireCurrentUserId, UnauthorizedError } from '@/lib/auth/require-user';
import { addInvestmentSnapshot } from '@/modules/finance/service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const userId = await requireCurrentUserId();
        const { id } = await params;
        const snapshot = await addInvestmentSnapshot(
            prisma,
            userId,
            id,
            await request.json(),
        );

        return Response.json({
            snapshot: {
                ...snapshot,
                amountInCents: snapshot.amountInCents.toString(),
            },
        }, { status: 201 });
    } catch (error) {
        if (error instanceof UnauthorizedError) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (error instanceof Error && error.message === 'Investment not found') {
            return Response.json({ error: 'Investment not found' }, { status: 404 });
        }

        if (error instanceof z.ZodError || error instanceof SyntaxError
            || (error instanceof Error && error.message.startsWith('Amount exceeds'))) {
            return Response.json({ error: 'Invalid valuation' }, { status: 400 });
        }

        throw error;
    }
}
