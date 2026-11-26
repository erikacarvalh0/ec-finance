import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireCurrentUserId, UnauthorizedError } from '@/lib/auth/require-user';
import { CategoryConflict, CategoryMissing, listManagedCategories, manageCategory } from '@/modules/categories/management';

export const dynamic = 'force-dynamic';
const headers = {'Cache-Control':'private, no-store'};
function errorResponse(error: unknown) {
    if (error instanceof UnauthorizedError) return Response.json({error:'Não autenticado.'},{status:401,headers});
    if (error instanceof CategoryMissing) return Response.json({error:error.message},{status:404,headers});
    if (error instanceof CategoryConflict) return Response.json({error:error.message},{status:409,headers});
    if (error instanceof z.ZodError || error instanceof SyntaxError) return Response.json({error:'Dados inválidos.'},{status:400,headers});
    if (error instanceof Prisma.PrismaClientKnownRequestError && ['P2002','P2003','P2034'].includes(error.code)) return Response.json({error:'Categoria duplicada, em uso ou alterada simultaneamente.'},{status:409,headers});
    throw error;
}
export async function GET() {
    try { return Response.json({categories:await listManagedCategories(prisma,await requireCurrentUserId())},{headers}); }
    catch(error) { return errorResponse(error); }
}
export async function POST(request: Request) {
    try {
        const userId = await requireCurrentUserId();
        if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') return Response.json({error:'Content-Type inválido.'},{status:415,headers});
        return Response.json({categories:await manageCategory(prisma,userId,await request.json())},{headers});
    } catch(error) { return errorResponse(error); }
}
