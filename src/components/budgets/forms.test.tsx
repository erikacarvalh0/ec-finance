// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BudgetLimitForm, NewCategoryForm } from './forms';

vi.mock('next/navigation', () => ({
    useRouter: () => ({ refresh: vi.fn() }),
}));

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

describe('budget and category forms', () => {
    it('creates a category with a name supplied by the user', async () => {
        const mockFetch = vi.fn().mockResolvedValue({ ok: true });
        vi.stubGlobal('fetch', mockFetch);
        const user = userEvent.setup();

        render(<NewCategoryForm />);
        await user.type(screen.getByLabelText('Nova categoria'), 'Mercado');
        await user.click(screen.getByRole('button', { name: 'Adicionar categoria' }));

        await waitFor(() => {
            expect(mockFetch).toHaveBeenCalledWith(
                '/api/categories',
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({ name: 'Mercado' }),
                }),
            );
        });
    });

    it('saves the selected month and category using integer cents', async () => {
        const mockFetch = vi.fn().mockResolvedValue({ ok: true });
        vi.stubGlobal('fetch', mockFetch);
        const user = userEvent.setup();

        render(<BudgetLimitForm
            categoryId="category-a"
            period="2026-11"
            currentLimitInCents={null}
        />);
        await user.type(screen.getByLabelText('Limite mensal (R$)'), '750,50');
        await user.click(screen.getByRole('button', { name: 'Salvar limite' }));

        await waitFor(() => {
            expect(mockFetch).toHaveBeenCalledWith(
                '/api/budgets',
                expect.objectContaining({
                    method: 'PUT',
                    body: JSON.stringify({
                        categoryId: 'category-a',
                        period: '2026-11',
                        limitInCents: '75050',
                    }),
                }),
            );
        });
    });
});
