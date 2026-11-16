import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireCurrentUserId, UnauthorizedError } from '@/lib/auth/require-user';
import { createExpense, listExpenses } from '@/modules/finance/service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const userId = await requireCurrentUserId();
        const expenses = await listExpenses(prisma, userId);

        return Response.json({
            expenses: expenses.map((expense) => ({
                ...expense,
                amountInCents: expense.amountInCents.toString(),
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
        const expense = await createExpense(prisma, userId, await request.json());

        return Response.json({
            expense: {
                ...expense,
                amountInCents: expense.amountInCents.toString(),
            },
        }, { status: 201 });
    } catch (error) {
        if (error instanceof UnauthorizedError) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (error instanceof Error && error.message === 'Card not found') {
            return Response.json({ error: 'Card not found' }, { status: 404 });
        }

        if (error instanceof z.ZodError || error instanceof SyntaxError
            || (error instanceof Error && error.message.startsWith('Amount exceeds'))) {
            return Response.json({ error: 'Invalid expense' }, { status: 400 });
        }

        throw error;
    }
}
