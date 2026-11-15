import { prisma } from '@/lib/prisma';
import { requireCurrentUserId, UnauthorizedError } from '@/lib/auth/require-user';
import { markCardTransactionFixed } from '@/modules/finance/fixed-expenses-service';

export const runtime = 'nodejs';

export async function POST(
    _request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const userId = await requireCurrentUserId();
        const { id } = await params;
        await markCardTransactionFixed(prisma, userId, id);

        return Response.json({ isFixed: true });
    } catch (error) {
        if (error instanceof UnauthorizedError) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (error instanceof Error && error.message === 'Transaction not found') {
            return Response.json({ error: 'Transaction not found' }, { status: 404 });
        }

        throw error;
    }
}
