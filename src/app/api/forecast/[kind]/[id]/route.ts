import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import {
    requireCurrentUserId,
    UnauthorizedError,
} from '@/lib/auth/require-user';
import { updateForecastOccurrence } from '@/modules/forecast/occurrences';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const pathSchema = z.object({
    kind: z.enum(['expense', 'income']),
    id: z.string().min(1),
});

export async function PATCH(
    request: Request,
    { params }: {
        params: Promise<{ kind: string; id: string }>;
    },
) {
    try {
        const userId = await requireCurrentUserId();
        const path = pathSchema.safeParse(await params);

        if (!path.success) {
            return Response.json({ error: 'Invalid occurrence' }, { status: 400 });
        }

        const updated = await updateForecastOccurrence(
            prisma,
            userId,
            path.data.kind,
            path.data.id,
            await request.json(),
        );

        return Response.json({
            occurrence: {
                id: updated.id,
                status: updated.status,
                actualAmountInCents: updated.actualAmountInCents?.toString() ?? null,
            },
        }, {
            headers: {
                'Cache-Control': 'no-store',
            },
        });
    } catch (error) {
        if (error instanceof UnauthorizedError) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (error instanceof Error && (
            error.message === 'Forecast source not found'
            || error.message === 'Forecast occurrence not found'
        )) {
            return Response.json({ error: 'Occurrence not found' }, { status: 404 });
        }

        if (error instanceof z.ZodError || error instanceof SyntaxError
            || (error instanceof Error && error.message.startsWith('Recorded amount exceeds'))) {
            return Response.json({ error: 'Invalid occurrence update' }, { status: 400 });
        }

        throw error;
    }
}
