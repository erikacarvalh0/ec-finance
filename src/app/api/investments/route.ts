import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireCurrentUserId, UnauthorizedError } from '@/lib/auth/require-user';
import { createInvestment, listInvestments } from '@/modules/finance/service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const userId = await requireCurrentUserId();
        const investments = await listInvestments(prisma, userId);

        return Response.json({
            investments: investments.map((investment) => ({
                ...investment,
                snapshots: investment.snapshots.map((snapshot) => ({
                    ...snapshot,
                    amountInCents: snapshot.amountInCents.toString(),
                })),
            })),
        }, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
        if (error instanceof UnauthorizedError) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        throw error;
    }
}

export async function POST(request: Request) {
    try {
        const userId = await requireCurrentUserId();
        const investment = await createInvestment(prisma, userId, await request.json());

        return Response.json({ investment }, { status: 201 });
    } catch (error) {
        if (error instanceof UnauthorizedError) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (error instanceof z.ZodError || error instanceof SyntaxError) {
            return Response.json({ error: 'Invalid investment' }, { status: 400 });
        }

        throw error;
    }
}
