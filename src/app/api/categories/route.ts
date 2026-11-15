import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireCurrentUserId, UnauthorizedError } from '@/lib/auth/require-user';
import { createCategory, listCategories } from '@/modules/categories/service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z.object({
    name: z.string().min(1).max(100),
});

export async function GET() {
    try {
        const userId = await requireCurrentUserId();
        const categories = await listCategories(prisma, userId);

        return Response.json(
            { categories },
            { headers: { 'Cache-Control': 'no-store' } },
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
        const body = bodySchema.safeParse(await request.json());

        if (!body.success) {
            return Response.json({ error: 'Invalid category' }, { status: 400 });
        }

        const category = await createCategory(prisma, userId, body.data.name);

        return Response.json({ category }, { status: 201 });
    } catch (error) {
        if (error instanceof UnauthorizedError) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return Response.json({ error: 'Category already exists' }, { status: 409 });
        }

        if (error instanceof SyntaxError) {
            return Response.json({ error: 'Malformed JSON' }, { status: 400 });
        }

        if (error instanceof Error && error.message.startsWith('Category name must')) {
            return Response.json({ error: error.message }, { status: 400 });
        }

        throw error;
    }
}
