import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireCurrentUserId, UnauthorizedError } from '@/lib/auth/require-user';
import { createManualTransaction, MissingOwnedResourceError } from '@/modules/transactions/create';
import { listUserTransactions } from '@/modules/transactions/repository';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const createSchema = z.object({
    cardId: z.string().trim().min(1),
    categoryId: z.string().trim().min(1).nullable().optional(),
    description: z.string().trim().min(1).max(255),
    amountInCents: z.string().regex(/^[1-9][0-9]*$/).max(18),
    occurredAt: z.iso.datetime({ offset: true }),
});

export async function GET() {
    try {
        const userId = await requireCurrentUserId();
        const transactions = await listUserTransactions(prisma, userId);

        return Response.json(
            {
                transactions: transactions.map((transaction) => ({
                    ...transaction,
                    amountInCents: transaction.amountInCents.toString(),
                })),
            },
            {
                headers: {
                    'Cache-Control': 'no-store',
                },
            },
        );
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
        const input = createSchema.safeParse(await request.json());

        if (!input.success) {
            return Response.json({ error: 'Invalid transaction' }, { status: 400 });
        }

        const transaction = await createManualTransaction(prisma, userId, input.data);

        return Response.json({
            transaction: {
                ...transaction,
                amountInCents: transaction.amountInCents.toString(),
            },
        }, { status: 201 });
    } catch (error) {
        if (error instanceof UnauthorizedError) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (error instanceof MissingOwnedResourceError) {
            return Response.json({ error: error.message }, { status: 404 });
        }

        if (error instanceof SyntaxError) {
            return Response.json({ error: 'Malformed JSON' }, { status: 400 });
        }

        throw error;
    }
}
