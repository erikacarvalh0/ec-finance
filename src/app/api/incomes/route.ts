import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireCurrentUserId, UnauthorizedError } from '@/lib/auth/require-user';
import { createIncome, listIncomes } from '@/modules/finance/service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const userId = await requireCurrentUserId();
        const incomes = await listIncomes(prisma, userId);

        return Response.json({
            incomes: incomes.map((income) => ({
                ...income,
                amountInCents: income.amountInCents.toString(),
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
        const income = await createIncome(prisma, userId, await request.json());

        return Response.json({
            income: {
                ...income,
                amountInCents: income.amountInCents.toString(),
            },
        }, { status: 201 });
    } catch (error) {
        if (error instanceof UnauthorizedError) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (error instanceof Error && error.message === 'Category not found') {
            return Response.json({ error: error.message }, { status: 404 });
        }

        if (error instanceof z.ZodError || error instanceof SyntaxError
            || (error instanceof Error && error.message.startsWith('Amount exceeds'))) {
            return Response.json({ error: 'Invalid income' }, { status: 400 });
        }

        throw error;
    }
}
