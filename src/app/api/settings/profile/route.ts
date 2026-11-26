import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireCurrentUserId, UnauthorizedError } from '@/lib/auth/require-user';
import { updateProfile } from '@/modules/settings/profile';

export const runtime = 'nodejs';
const headers = { 'Cache-Control': 'private, no-store' };

export async function PATCH(request: Request) {
    try {
        const userId = await requireCurrentUserId();
        if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
            return Response.json({ error: 'Content-Type inválido.' }, { status: 415, headers });
        }
        const profile = await updateProfile(prisma, userId, await request.json());
        return Response.json({ profile }, { headers });
    } catch (error) {
        if (error instanceof UnauthorizedError) return Response.json({ error: 'Unauthorized' }, { status: 401, headers });
        if (error instanceof z.ZodError || error instanceof SyntaxError) {
            return Response.json({ error: 'Nome inválido ou alteração não permitida.' }, { status: 400, headers });
        }
        throw error;
    }
}
