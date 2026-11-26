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
    const amount = screen.getByLabelText('Valor (R$)') as HTMLInputElement;
    const form = amount.closest('form')!;
    const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
    expect(form.noValidate).toBe(true);
    expect(submit.textContent).toContain('Salvar');

    const description = screen.getByLabelText('Descrição');
    fireEvent.change(description, { target: { value: 'Mercado' } });
    fireEvent.blur(description);
    fireEvent.change(amount, { target: { value: 'abc' } });
    fireEvent.blur(amount);
    await waitFor(() => {
        expect(amount.getAttribute('aria-invalid')).toBe('true');
        const errorId = amount.getAttribute('aria-describedby');
        expect(errorId).toBeTruthy();
        expect(document.getElementById(errorId!)?.textContent).toContain('duas casas');
        expect(submit.disabled).toBe(true);
    });

    fireEvent.change(amount, { target: { value: '12,50' } });
    fireEvent.blur(amount);
    await waitFor(() => {
        expect(amount.getAttribute('aria-invalid')).toBe('false');
        expect(amount.hasAttribute('aria-describedby')).toBe(false);
        expect(submit.disabled).toBe(false);
    });
});

it.each([[0, true], [4, true], [5, false], [6, false]] as const)('sets initial accordion state for %s expenses', (count, open) => {
    const { container } = render(<ExpenseForm monthlyExpenseCount={count} />);
    expect(container.querySelector<HTMLInputElement>('input[type="checkbox"]')?.checked).toBe(open);
});
