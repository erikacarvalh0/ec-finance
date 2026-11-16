import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getUserMonthlyCashflowReport } from '@/modules/reports/monthly';
import { summarizeAnnualCashflow } from '@/modules/reports/annual';
import { formatAnnualCashflowCsv, parseAnnualExportYear } from '@/modules/reports/annual-csv';

export async function GET(request: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let year: number;
    try {
        year = parseAnnualExportYear(request.nextUrl.searchParams.get('year') ?? '');
    } catch {
        return Response.json({ error: 'Invalid annual reporting year' }, { status: 400 });
    }

    const months = await getUserMonthlyCashflowReport(
        prisma, session.user.id, new Date(Date.UTC(year, 0, 1)), 12,
    );
    const annual = summarizeAnnualCashflow(year, months);

    return new Response('\uFEFF' + formatAnnualCashflowCsv([annual]), {
        headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="cashflow-annual-${year}.csv"`,
            'Cache-Control': 'private, no-store',
            'X-Content-Type-Options': 'nosniff',
        },
    });
}
