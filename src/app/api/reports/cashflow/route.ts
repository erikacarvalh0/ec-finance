import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getUserMonthlyCashflowReport } from '@/modules/reports/monthly';
import { formatCashflowCsv, parseCashflowExportPeriod } from '@/modules/reports/csv';

export async function GET(request: NextRequest) {
    const session = await auth();

    if (!session?.user?.id) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const period = request.nextUrl.searchParams.get('period') ?? '';

    let start: Date;
    try {
        start = parseCashflowExportPeriod(period);
    } catch {
        return Response.json({ error: 'Invalid reporting period' }, { status: 400 });
    }

    const months = await getUserMonthlyCashflowReport(prisma, session.user.id, start, 1);

    return new Response('\uFEFF' + formatCashflowCsv(months), {
        headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="cashflow-${period}.csv"`,
            'Cache-Control': 'private, no-store',
            'X-Content-Type-Options': 'nosniff',
        },
    });
}
