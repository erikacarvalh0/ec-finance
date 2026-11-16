import { prisma } from '@/lib/prisma';
import { requireCurrentUserId, UnauthorizedError } from '@/lib/auth/require-user';
import { getUserCardInvoice } from '@/modules/cards/service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string; period: string }> },
) {
    try {
        const userId = await requireCurrentUserId();
        const { id, period } = await params;
        const invoice = await getUserCardInvoice(prisma, userId, id, period);

        return Response.json({
            ...invoice,
            totalInCents: invoice.totalInCents.toString(),
            lines: invoice.lines.map((line) => ({
                ...line,
                amountInCents: line.amountInCents.toString(),
            })),
        }, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
        if (error instanceof UnauthorizedError) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (error instanceof Error && error.message === 'Card not found') {
            return Response.json({ error: 'Card not found' }, { status: 404 });
        }

        if (error instanceof Error && (
            error.message === 'Invalid invoice period'
            || error.message === 'Card billing cycle is not configured'
        )) {
            return Response.json({ error: error.message }, { status: 400 });
        }

        throw error;
    }
}
