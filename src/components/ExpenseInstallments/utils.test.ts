import { expect, it } from 'vitest';
import { getExpenseInstallments } from './utils';

it('preserves cents, clamped dates and occurrence status', () => {
    const rows = getExpenseInstallments({
        id: 'expense',
        description: 'Compra',
        amountInCents: '1000',
        firstDueDate: '2026-01-31',
        installments: 3,
    }, [{ month: '2026-02', status: 'SETTLED', actualAmountInCents: '320' }]);

    expect(rows.map(row => row.amountInCents.toString())).toEqual(['334', '333', '333']);
    expect(rows[1]).toMatchObject({ date: '2026-02-28', status: 'SETTLED', actualAmountInCents: BigInt(320) });
    expect(rows[2].status).toBe('PENDING');
});
