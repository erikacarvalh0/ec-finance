// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { ExpenseDetails } from './index';

afterEach(cleanup);

it('renders the supplied expense details without editing controls', () => {
    render(<ExpenseDetails expense={{
        description: 'Mercado',
        amount: 'R$ 50,00',
        type: 'Variável',
        category: 'Alimentação',
        paymentMethod: 'Pix',
        date: '18/11/2026',
        installments: '1/3',
        status: 'Pendente',
    }} />);
    expect(screen.getByText('Mercado')).toBeTruthy();
    expect(screen.getByText('R$ 50,00')).toBeTruthy();
    expect(screen.getByText('1/3')).toBeTruthy();
    expect(screen.getByText('Pendente')).toBeTruthy();
    expect(screen.queryByRole('textbox')).toBeNull();
});
