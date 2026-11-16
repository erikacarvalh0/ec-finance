// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CardSettingsForm, LinkImportedTransactionForm } from './card-forms';

vi.mock('next/navigation', () => ({
    useRouter: () => ({ refresh: vi.fn() }),
}));

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

describe('credit-card controls', () => {
    it('creates manual cards with explicit closing and due days', async () => {
        const user = userEvent.setup();
        const fetchMock = vi.fn().mockResolvedValue({ ok: true });
        vi.stubGlobal('fetch', fetchMock);

        render(<CardSettingsForm />);

        await user.type(screen.getByLabelText('Nome do cartão'), 'My card');
        await user.click(screen.getByRole('button', { name: 'Adicionar cartão' }));

        await waitFor(() => {
            expect(fetchMock).toHaveBeenCalledWith(
                '/api/cards',
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({
                        name: 'My card',
                        closingDay: 10,
                        dueDay: 20,
                    }),
                }),
            );
        });
    });

    it('sends the exact selected transaction ID for explicit duplicate linking', async () => {
        const user = userEvent.setup();
        const fetchMock = vi.fn().mockResolvedValue({ ok: true });
        vi.stubGlobal('fetch', fetchMock);

        render(<LinkImportedTransactionForm
            expenseId="expense-a"
            transactions={[{
                id: 'transaction-a',
                description: 'Spotify',
                amountInCents: '2990',
            }]}
        />);

        await user.selectOptions(
            screen.getByLabelText('Vincular à compra importada (se for a mesma transação)'),
            'transaction-a',
        );
        await user.click(screen.getByRole('button', { name: 'Vincular compra' }));

        await waitFor(() => {
            expect(fetchMock).toHaveBeenCalledWith(
                '/api/expenses/expense-a/card-link',
                expect.objectContaining({
                    method: 'PATCH',
                    body: JSON.stringify({ transactionId: 'transaction-a' }),
                }),
            );
        });
    });
});
