// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExpenseForm, IncomeForm, InvestmentForm, MarkFixedButton } from './forms';

vi.mock('next/navigation', () => ({
    useRouter: () => ({ refresh: vi.fn() }),
}));

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

describe('finance forms', () => {
    it('shows all expense fields with one installment selected by default', () => {
        render(<ExpenseForm />);

        expect(screen.getByLabelText('Descrição')).toBeTruthy();
        expect(screen.getByLabelText('Valor (R$)')).toBeTruthy();
        expect(screen.getByLabelText('Forma de pagamento')).toBeTruthy();
        expect(screen.getByLabelText('Tipo')).toBeTruthy();
        expect(screen.getByLabelText('Data (opcional)')).toBeTruthy();
        expect((screen.getByLabelText('Parcelas') as HTMLInputElement).value).toBe('1');
    });

    it('keeps required fields visible and changes type guidance', async () => {
        const user = userEvent.setup();

        render(<IncomeForm />);

        expect(screen.queryByLabelText('Responsável')).toBeNull();

        await user.selectOptions(screen.getByLabelText('Tipo'), 'RECURRING');

        expect(screen.queryByLabelText('Responsável')).toBeNull();
        expect(screen.getByText('Se repete todos os meses.')).toBeTruthy();
        expect(screen.getByLabelText('Descrição')).toBeTruthy();
        expect(screen.getByLabelText('Data da entrada')).toBeTruthy();
        await user.selectOptions(screen.getByLabelText('Tipo'), 'OTHER');
        expect(screen.getByText('Acontece uma única vez.')).toBeTruthy();
        await user.type(screen.getByLabelText('Valor (R$)'), '123456');
        expect((screen.getByLabelText('Valor (R$)') as HTMLInputElement).value).toBe('1.234,56');
    });

    it('separates investment creation and valuation update', () => {
        const { rerender } = render(<InvestmentForm />);

        expect(screen.getByLabelText('Nome do investimento')).toBeTruthy();

        rerender(<InvestmentForm investmentId="investment-a" />);

        expect(screen.getByLabelText('Valor atualizado (R$)')).toBeTruthy();
        expect(screen.getByLabelText('Data da atualização')).toBeTruthy();
    });

    it('marks a credit-card transaction as fixed through the API', async () => {
        const user = userEvent.setup();
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
        } as Response);
        vi.stubGlobal('fetch', fetchMock);

        render(<MarkFixedButton transactionId="transaction-a" />);

        await user.click(screen.getByRole('button', { name: 'Marcar como fixa' }));

        expect(fetchMock).toHaveBeenCalledWith(
            '/api/transactions/transaction-a/fixed',
            expect.objectContaining({
                method: 'POST',
                credentials: 'same-origin',
            }),
        );
    });
});
