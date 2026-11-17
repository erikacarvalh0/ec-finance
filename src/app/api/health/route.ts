import { prisma } from '@/lib/prisma';
import { checkReadiness } from '@/modules/health/readiness';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
    const result = await checkReadiness(() => prisma.$queryRaw`SELECT 1`);
    return Response.json({ ready: result.ready }, {
        status: result.status,
        headers: { 'Cache-Control': 'no-store' },
    });
}
