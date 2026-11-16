import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireCurrentUserId, UnauthorizedError } from '@/lib/auth/require-user';
import { updateOwnedExpense } from '@/modules/finance/edit-record';

export const runtime = 'nodejs';

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const userId = await requireCurrentUserId();
        const { id } = await params;
        const result = await updateOwnedExpense(
            prisma,
            userId,
            id,
            await request.json(),
        );

        return Response.json({
            expense: {
                ...result,
                amountInCents: result.amountInCents.toString(),
            },
        }, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
        if (error instanceof UnauthorizedError) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (error instanceof Error && error.message === 'Record not found') {
            return Response.json({ error: 'Record not found' }, { status: 404 });
        }

        if (error instanceof Error && error.message === 'Settled occurrences prevent editing') {
            return Response.json({ error: error.message }, { status: 409 });
        }

        if (error instanceof Error && error.message === 'Category not found') {
            return Response.json({ error: 'Category not found' }, { status: 404 });
        }

        if (error instanceof z.ZodError || error instanceof SyntaxError
            || (error instanceof Error && error.message.startsWith('Amount exceeds'))) {
            return Response.json({ error: 'Invalid expense update' }, { status: 400 });
        }

        throw error;
    }
}
