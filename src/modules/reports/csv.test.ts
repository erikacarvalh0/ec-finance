import { describe, expect, it } from 'vitest';
import { formatCashflowCsv, parseCashflowExportPeriod } from './csv';

describe('cashflow CSV export', () => {
    it('accepts only a valid UTC calendar month', () => {
        expect(parseCashflowExportPeriod('2026-11')).toEqual(new Date('2026-11-01T00:00:00.000Z'));
        expect(() => parseCashflowExportPeriod('2026-13')).toThrow();
        expect(() => parseCashflowExportPeriod('2026-11-01')).toThrow();
    });

    it('exports exact integer cents and signed net balances', () => {
        expect(formatCashflowCsv([{
            period: '2026-11',
            incomeInCents: BigInt('90071992547409930'),
            expenseInCents: BigInt(500),
            netInCents: BigInt('90071992547409430'),
        }])).toBe(
            'period,income_in_cents,expense_in_cents,net_in_cents\r\n'
            + '2026-11,90071992547409930,500,90071992547409430\r\n',
        );
    });

    it('exports a header-only CSV for empty reports', () => {
        expect(formatCashflowCsv([])).toBe('period,income_in_cents,expense_in_cents,net_in_cents\r\n');
    });

    it('rejects malformed periods instead of allowing spreadsheet formulas', () => {
        expect(() => formatCashflowCsv([{
            period: '=1+1',
            incomeInCents: BigInt(0),
            expenseInCents: BigInt(0),
            netInCents: BigInt(0),
        }])).toThrow();
    });
});
