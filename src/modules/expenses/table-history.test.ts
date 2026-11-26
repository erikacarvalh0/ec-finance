import { expect, it } from 'vitest';
import { mapExpenseTableRows } from './table-history';

const expense = {
    id: 'a', description: 'Compra', amountInCents: BigInt(1000),
    date: new Date('2026-09-30T00:00:00Z'), createdAt: new Date('2026-09-30T00:00:00Z'),
    installments: 3, type: 'VARIABLE' as const, paymentMethod: 'CREDIT', occurrences: [],
};
it('maps the actual due installment and implicit status', () => {
    expect(mapExpenseTableRows(expense, '2026-11', 'PENDING', 'Mercado')[0]).toMatchObject({
        id: 'a:2026-11', installments: '3/3', date: '30/11/2026', status: 'Pendente',
    });
    expect(mapExpenseTableRows(expense, '2026-12', undefined, '')).toEqual([]);
});
it('uses settled amount and filters by selected occurrence status', () => {
    const paid = { ...expense, occurrences: [{ dueMonth: new Date('2026-11-01T00:00:00Z'), status: 'SETTLED' as const, actualAmountInCents: BigInt(400) }] };
    expect(mapExpenseTableRows(paid, '2026-11', 'PENDING', '')).toEqual([]);
    expect(mapExpenseTableRows(paid, '2026-11', 'SETTLED', '')[0].amount).toContain('4,00');
});
