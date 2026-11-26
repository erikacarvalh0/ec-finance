// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { ExpenseTable } from './index';

vi.mock('@erikacarvalho/react/Table', () => ({
    Table: ({ data, children }: { data: Record<string, ReactNode>[]; children: ReactNode }) => (
        <table>
            <thead><tr>{children}</tr></thead>
            <tbody>{data.map((row, index) => (
                <tr key={index}>{Object.values(row).map((cell, column) => <td key={column}>{cell}</td>)}</tr>
            ))}</tbody>
        </table>
    ),
}));

afterEach(cleanup);

it('renders an empty state', () => {
    render(<ExpenseTable rows={[]} />);
    expect(screen.getByText('Nenhuma despesa registrada.')).toBeTruthy();
});

it('renders expense data and row actions without exposing the identifier', () => {
    render(<ExpenseTable rows={[{
        id: 'internal-id',
        date: '18/11/2026',
        description: 'Mercado',
        category: 'Alimentação',
        paymentMethod: 'Pix',
        installments: '—',
        amount: 'R$ 50,00',
        status: 'Pendente',
        actions: <button>Detalhes</button>,
    }]} />);
    expect(screen.getByText('Mercado')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Detalhes' })).toBeTruthy();
    expect(screen.queryByText('internal-id')).toBeNull();
});
