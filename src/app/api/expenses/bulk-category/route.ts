import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireCurrentUserId, UnauthorizedError } from '@/lib/auth/require-user';
import { bulkReclassifyExpenses } from '@/modules/expenses/bulk-category';

const schema = z.object({
    ids: z.array(z.string().trim().min(1)).min(1).max(100),
    categoryId: z.string().trim().min(1).nullable(),
    preview: z.boolean().default(true),
}).strict().refine(input => new Set(input.ids).size === input.ids.length);

export async function POST(request: Request) {
    try {
        const userId = await requireCurrentUserId();
        const input = schema.parse(await request.json());
        if (input.preview) {
            if (input.categoryId !== null && !await prisma.category.findFirst({
                where: { id: input.categoryId, userId }, select: { id: true },
            })) return Response.json({ error: 'Category not found' }, { status: 404 });
            const rows = await prisma.expense.findMany({
                where: { userId, id: { in: input.ids } },
                select: { id: true, description: true, categoryId: true },
            });
            if (rows.length !== input.ids.length) {
                return Response.json({ error: 'Expense selection not found' }, { status: 404 });
            }
            return Response.json({ rows, categoryId: input.categoryId }, {
                headers: { 'Cache-Control': 'private, no-store' },
            });
        }
        const count = await bulkReclassifyExpenses(prisma, userId, input.ids, input.categoryId);
        return Response.json({ count });
    } catch (error) {
        if (error instanceof UnauthorizedError) return Response.json({ error: 'Unauthorized' }, { status: 401 });
        if (error instanceof z.ZodError || error instanceof SyntaxError) {
            return Response.json({ error: 'Invalid selection' }, { status: 400 });
        }
        if (error instanceof Error && ['Category not found', 'Expense selection not found'].includes(error.message)) {
            return Response.json({ error: error.message }, { status: 404 });
        }
        throw error;
    }
}
