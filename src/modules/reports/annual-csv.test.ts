import { describe, expect, it } from 'vitest';
import { parseAnnualExportYear, formatAnnualCashflowCsv } from './annual-csv';

describe('annual cashflow CSV export', () => {
    it('validates the exact year before querying', () => {
        expect(parseAnnualExportYear('2026')).toBe(2026);
        expect(() => parseAnnualExportYear('2026-01')).toThrow();
        expect(() => parseAnnualExportYear('=1+1')).toThrow();
        expect(() => parseAnnualExportYear('0099')).toThrow();
    });

    it('exports a signed annual summary with exact bigint cents', () => {
        expect(formatAnnualCashflowCsv([{
            year: 2026,
            incomeInCents: BigInt('90071992547409930'),
            expenseInCents: BigInt(1200),
            netInCents: BigInt('90071992547408730'),
            monthsWithRecords: 9,
        }])).toBe(
            'year,income_in_cents,expense_in_cents,net_in_cents,months_with_records\r\n'
            + '2026,90071992547409930,1200,90071992547408730,9\r\n',
        );
    });

    it('rejects invalid aggregate year and counts', () => {
        expect(() => formatAnnualCashflowCsv([{
            year: 2026, incomeInCents: BigInt(0), expenseInCents: BigInt(0),
            netInCents: BigInt(0), monthsWithRecords: 13,
        }])).toThrow();
    });
});
