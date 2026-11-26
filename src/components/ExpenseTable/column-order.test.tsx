// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { ExpenseTable } from './index';

vi.mock('@erikacarvalho/react/Table', () => ({
    Table: ({ data, children }: { data: Record<string, ReactNode>[]; children: ReactNode }) => (
        <table><thead><tr>{children}</tr></thead><tbody>{data.map((row, index) => (
            <tr key={index}>{Object.values(row).map((value, column) => <td key={column}>{value}</td>)}</tr>
        ))}</tbody></table>
    ),
}));
afterEach(cleanup);

it('keeps cells aligned with headers regardless of input property order', () => {
    render(<ExpenseTable rows={[{
        id: 'expense', actions: 'Menu', status: 'Pendente', amount: 'R$ 10', installments: '1/1',
        paymentMethod: 'Pix', category: 'Casa', description: 'Compra', date: '26/11/2026',
    }]} />);
    expect(screen.getAllByRole('cell').map(cell => cell.textContent)).toEqual([
        '26/11/2026', 'Compra', 'Casa', 'Pix', '1/1', 'R$ 10', 'Pendente', 'Menu',
    ]);
});
