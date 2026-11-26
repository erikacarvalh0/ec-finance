// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ExpenseForm } from './index';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
afterEach(cleanup);

it('shows installments only for supported payment methods and places card after date', () => {
    render(<ExpenseForm />);
    expect(screen.getByLabelText('Parcelas')).toBeTruthy();
    const payment = screen.getByLabelText('Forma de pagamento');
    fireEvent.change(payment, { target: { value: 'Débito' } });
    fireEvent.blur(payment);
    expect(screen.queryByLabelText('Parcelas')).toBeNull();
    fireEvent.change(payment, { target: { value: 'Crédito' } });
    fireEvent.blur(payment);
    expect(screen.getByLabelText('Parcelas')).toBeTruthy();
    const card = screen.getByLabelText('Cartão (opcional)');
    expect(screen.getByLabelText('Data (opcional)').compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});

it('delegates field validation to ECDS and disables invalid submission', async () => {
    render(<ExpenseForm />);
    const amount = screen.getByLabelText('Valor (R$)');
    fireEvent.change(amount, { target: { value: 'abc' } });
    fireEvent.blur(amount);
    expect(amount.getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByRole('alert').textContent).toContain('duas casas');
    await waitFor(() => expect((screen.getByRole('button', { name: 'Salvar' }) as HTMLButtonElement).disabled).toBe(true));
    expect(amount.closest('form')?.noValidate).toBe(true);
});

it.each([[0, true], [4, true], [5, false], [6, false]] as const)('sets initial accordion state for %s expenses', (count, open) => {
    const { container } = render(<ExpenseForm monthlyExpenseCount={count} />);
    expect(container.querySelector<HTMLInputElement>('input[type="checkbox"]')?.checked).toBe(open);
});
