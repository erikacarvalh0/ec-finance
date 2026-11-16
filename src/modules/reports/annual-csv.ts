import { summarizeAnnualCashflow } from './annual';

type AnnualCashflow = ReturnType<typeof summarizeAnnualCashflow>;

export function parseAnnualExportYear(value: string) {
    if (!/^[1-9][0-9]{3}$/.test(value)) {
        throw new Error('Invalid annual export year');
    }
    return Number(value);
}

export function formatAnnualCashflowCsv(annual: AnnualCashflow[]) {
    const header = 'year,income_in_cents,expense_in_cents,net_in_cents,months_with_records\r\n';
    return header + annual.map((row) => {
        parseAnnualExportYear(String(row.year));
        if (!Number.isInteger(row.monthsWithRecords)
            || row.monthsWithRecords < 0 || row.monthsWithRecords > 12) {
            throw new Error('Invalid annual record count');
        }
        return [
            row.year,
            row.incomeInCents.toString(),
            row.expenseInCents.toString(),
            row.netInCents.toString(),
            row.monthsWithRecords,
        ].join(',') + '\r\n';
    }).join('');
}
