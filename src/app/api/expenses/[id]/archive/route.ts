import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireCurrentUserId, UnauthorizedError } from '@/lib/auth/require-user';
import { setExpenseArchived } from '@/modules/expenses/archive';

export const runtime = 'nodejs';

const inputSchema = z.object({ archived: z.boolean() }).strict();

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const userId = await requireCurrentUserId();
        const { id } = await params;
        const { archived } = inputSchema.parse(await request.json());
        const updated = await setExpenseArchived(prisma, userId, id, archived);

        if (!updated) {
            return Response.json({ error: 'Record not found or already in requested state' }, { status: 404 });
        }

        return Response.json({ archived }, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
        if (error instanceof UnauthorizedError) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (error instanceof z.ZodError || error instanceof SyntaxError) {
            return Response.json({ error: 'Invalid archive request' }, { status: 400 });
        }

        throw error;
    }
}
