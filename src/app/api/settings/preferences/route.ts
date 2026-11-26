import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireCurrentUserId, UnauthorizedError } from '@/lib/auth/require-user';
import { getPreferences, savePreferences } from '@/modules/settings/preferences';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const headers = { 'Cache-Control': 'private, no-store' };

function handleError(error: unknown): Response {
    if (error instanceof UnauthorizedError) {
        return Response.json({ error: 'Unauthorized' }, { status: 401, headers });
    }
    if (error instanceof z.ZodError || error instanceof SyntaxError) {
        return Response.json({ error: 'Preferências inválidas.' }, { status: 400, headers });
    }
    throw error;
}

export async function GET() {
    try {
        const userId = await requireCurrentUserId();
        return Response.json({ preferences: await getPreferences(prisma, userId) }, { headers });
    } catch (error) {
        return handleError(error);
    }
}

export async function PUT(request: Request) {
    try {
        const userId = await requireCurrentUserId();
        if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
            return Response.json({ error: 'Content-Type inválido.' }, { status: 415, headers });
        }
        const preferences = await savePreferences(prisma, userId, await request.json());
        return Response.json({ preferences }, { headers });
    } catch (error) {
        return handleError(error);
    }
}
