import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireCurrentUserId, UnauthorizedError } from '@/lib/auth/require-user';
import { endOwnedRecurrence } from '@/modules/finance/end-recurrence';

export const runtime = 'nodejs';

const endSchema = z.object({
    endsOn: z.iso.date(),
});

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ kind: string; id: string }> },
) {
    try {
        const userId = await requireCurrentUserId();
        const { kind, id } = await params;

        if (kind !== 'expense' && kind !== 'income') {
            return Response.json({ error: 'Invalid source type' }, { status: 400 });
        }

        const data = endSchema.parse(await request.json());
        await endOwnedRecurrence(prisma, userId, kind, id, data.endsOn);

        return Response.json({ endsOn: data.endsOn }, {
            headers: { 'Cache-Control': 'no-store' },
        });
    } catch (error) {
        if (error instanceof UnauthorizedError) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (error instanceof Error && error.message === 'Record not found') {
            return Response.json({ error: 'Record not found' }, { status: 404 });
        }

        if (error instanceof z.ZodError || error instanceof SyntaxError
            || (error instanceof Error && (
                error.message === 'Not a recurring record'
                || error.message === 'End date precedes start date'
            ))) {
            return Response.json({ error: 'Invalid recurrence end date' }, { status: 400 });
        }

        throw error;
    }
}
