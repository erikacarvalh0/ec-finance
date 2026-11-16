import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireCurrentUserId, UnauthorizedError } from '@/lib/auth/require-user';
import { linkManualCardExpense } from '@/modules/cards/service';

export const runtime = 'nodejs';

const inputSchema = z.object({
    transactionId: z.string().trim().min(1),
});

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const userId = await requireCurrentUserId();
        const { id } = await params;
        const { transactionId } = inputSchema.parse(await request.json());

        await linkManualCardExpense(prisma, userId, id, transactionId);

        return Response.json({ linked: true });
    } catch (error) {
        if (error instanceof UnauthorizedError) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (error instanceof Error && error.message === 'Record not found') {
            return Response.json({ error: 'Record not found' }, { status: 404 });
        }

        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return Response.json({ error: 'Transaction already linked' }, { status: 409 });
        }

        if (error instanceof z.ZodError || error instanceof SyntaxError
            || (error instanceof Error && error.message === 'Card mismatch')) {
            return Response.json({ error: 'Invalid card link' }, { status: 400 });
        }

        throw error;
    }
}
