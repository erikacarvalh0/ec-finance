import type { MonthlyRecordedCashflow } from './annual';

const periodPattern = /^(\d{4})-(0[1-9]|1[0-2])$/;

export function parseCashflowExportPeriod(period: string) {
    const match = periodPattern.exec(period);

    if (!match || Number(match[1]) < 1000) {
        throw new Error('Invalid cashflow export period');
    }

    return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1));
}

export function formatCashflowCsv(months: MonthlyRecordedCashflow[]) {
    const header = 'period,income_in_cents,expense_in_cents,net_in_cents\r\n';
    const rows = months.map((month) => {
        parseCashflowExportPeriod(month.period);

        return [
            month.period,
            month.incomeInCents.toString(),
            month.expenseInCents.toString(),
            month.netInCents.toString(),
        ].join(',');
    });

    return header + rows.map((row) => `${row}\r\n`).join('');
}
