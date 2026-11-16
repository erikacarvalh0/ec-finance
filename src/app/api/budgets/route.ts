import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireCurrentUserId, UnauthorizedError } from '@/lib/auth/require-user';
import { getCategoryBudgetReport, setCategoryBudget } from '@/modules/budgets/service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const userId = await requireCurrentUserId();
        const period = new URL(request.url).searchParams.get('period')
            ?? new Date().toISOString().slice(0, 7);
        const report = await getCategoryBudgetReport(prisma, userId, period);

        return Response.json({
            period: report.period,
            categories: report.categories.map((row) => ({
                ...row,
                spentInCents: row.spentInCents.toString(),
                limitInCents: row.limitInCents?.toString() ?? null,
                remainingInCents: row.remainingInCents?.toString() ?? null,
            })),
        }, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
        if (error instanceof UnauthorizedError) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (error instanceof Error && error.message === 'Invalid budget period') {
            return Response.json({ error: error.message }, { status: 400 });
        }
        throw error;
    }
}

export async function PUT(request: Request) {
    try {
        const userId = await requireCurrentUserId();
        const budget = await setCategoryBudget(prisma, userId, await request.json());

        return Response.json({
            budget: {
                ...budget,
                limitInCents: budget.limitInCents.toString(),
            },
        }, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
        if (error instanceof UnauthorizedError) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (error instanceof Error && error.message === 'Category not found') {
            return Response.json({ error: error.message }, { status: 404 });
        }
        if (error instanceof z.ZodError || error instanceof SyntaxError
            || (error instanceof Error && (
                error.message === 'Invalid budget period'
                || error.message === 'Budget amount exceeds supported range'
            ))) {
            return Response.json({ error: 'Invalid budget request' }, { status: 400 });
        }
        throw error;
    }
}
