// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ExpenseForm } from './index';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
afterEach(cleanup);

it('shows installments only for supported payment methods', () => {
    render(<ExpenseForm />);
    expect(screen.getByLabelText('Parcelas')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Forma de pagamento'), { target: { value: 'DEBIT' } });
    expect(screen.queryByLabelText('Parcelas')).toBeNull();
    fireEvent.change(screen.getByLabelText('Forma de pagamento'), { target: { value: 'CREDIT' } });
    expect(screen.getByLabelText('Parcelas')).toBeTruthy();
});

it.each([[0, true], [4, true], [5, false], [6, false]] as const)('sets initial accordion state for %s expenses', (count, open) => {
    const { container } = render(<ExpenseForm monthlyExpenseCount={count} />);
    expect(container.querySelector<HTMLInputElement>('input[type="checkbox"]')?.checked).toBe(open);
});
