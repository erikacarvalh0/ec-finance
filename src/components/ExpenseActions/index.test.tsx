// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ExpenseActions } from './index';

afterEach(cleanup);

it('offers only supported actions for an active expense', () => {
    const details = vi.fn();
    render(<ExpenseActions description="Mercado" archived={false} paid={false} installments={1} handlers={{ details, restore: vi.fn(), installments: vi.fn() }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ações de Mercado' }));
    expect(screen.queryByText('Restaurar despesa')).toBeNull();
    expect(screen.queryByText('Visualizar parcelas')).toBeNull();
    fireEvent.click(screen.getByText('Ver detalhes'));
    expect(details).toHaveBeenCalledOnce();
});

it('offers installment details and restore for archived expenses', () => {
    render(<ExpenseActions description="Mercado" archived paid installments={3} handlers={{ installments: vi.fn(), restore: vi.fn(), edit: vi.fn() }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ações de Mercado' }));
    expect(screen.getByText('Visualizar parcelas')).toBeTruthy();
    expect(screen.getByText('Restaurar despesa')).toBeTruthy();
    expect(screen.queryByText('Editar despesa')).toBeNull();
});
