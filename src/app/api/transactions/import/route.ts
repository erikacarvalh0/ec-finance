import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireCurrentUserId, UnauthorizedError } from '@/lib/auth/require-user';
import { importCardTransactions } from '@/modules/transactions/import';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const userId = await requireCurrentUserId();
        const body: unknown = await request.json();
        if (!body || typeof body !== 'object' || Array.isArray(body)
            || !('cardId' in body) || typeof body.cardId !== 'string'
            || !('transactions' in body)) {
            return Response.json({ error: 'Invalid transaction import' }, { status: 400 });
        }

        const result = await importCardTransactions(
            prisma, userId, body.cardId, body.transactions,
        );
        return Response.json(result, {
            status: 200,
            headers: { 'Cache-Control': 'no-store' },
        });
    } catch (error) {
        if (error instanceof UnauthorizedError) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (error instanceof Error && error.message === 'Credit card not found') {
            return Response.json({ error: 'Credit card not found' }, { status: 404 });
        }
        if (error instanceof Error && error.message === 'Conflicting imported transactions') {
            return Response.json({ error: error.message }, { status: 409 });
        }
        if (error instanceof z.ZodError || error instanceof SyntaxError
            || (error instanceof Error && error.message.startsWith('Transaction amount'))) {
            return Response.json({ error: 'Invalid transaction import' }, { status: 400 });
        }
        throw error;
    }
}
