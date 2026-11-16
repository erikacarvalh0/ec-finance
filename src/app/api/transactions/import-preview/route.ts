import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireCurrentUserId, UnauthorizedError } from '@/lib/auth/require-user';
import { previewCardTransactionImport } from '@/modules/transactions/import-preview';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const userId = await requireCurrentUserId();
        const body: unknown = await request.json();
        if (!body || typeof body !== 'object' || Array.isArray(body)
            || !('cardId' in body) || !('transactions' in body)
            || typeof body.cardId !== 'string') {
            return Response.json({ error: 'Invalid import preview' }, { status: 400 });
        }

        const preview = await previewCardTransactionImport(
            prisma, userId, body.cardId, body.transactions,
        );
        const serialize = (item: { amountInCents: bigint }) => ({
            ...item, amountInCents: item.amountInCents.toString(),
        });
        return Response.json({
            toImport: preview.toImport.map(serialize),
            duplicates: preview.duplicates.map(serialize),
            conflicts: preview.conflicts.map((conflict) => ({
                candidate: serialize(conflict.candidate),
                existing: {
                    ...conflict.existing,
                    ...(conflict.existing.amountInCents === undefined ? {}
                        : { amountInCents: conflict.existing.amountInCents.toString() }),
                },
            })),
        }, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
        if (error instanceof UnauthorizedError) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (error instanceof Error && error.message === 'Credit card not found') {
            return Response.json({ error: 'Credit card not found' }, { status: 404 });
        }
        if (error instanceof z.ZodError || error instanceof SyntaxError
            || (error instanceof Error && error.message.startsWith('Transaction amount'))) {
            return Response.json({ error: 'Invalid import preview' }, { status: 400 });
        }
        throw error;
    }
}
