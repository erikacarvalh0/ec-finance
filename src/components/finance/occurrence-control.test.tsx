// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OccurrenceControl } from './occurrence-control';

vi.mock('next/navigation', () => ({
    useRouter: () => ({ refresh: vi.fn() }),
}));

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

describe('forecast occurrence control', () => {
    it('allows marking an installment as settled with its actual amount', async () => {
        const fetchMock = vi.fn().mockResolvedValue({ ok: true });
        vi.stubGlobal('fetch', fetchMock);
        const user = userEvent.setup();

        render(
            <OccurrenceControl
                kind="expense"
                sourceId="expense-a"
                month="2027-02"
                initialStatus="PENDING"
            />,
        );

        await user.selectOptions(
            screen.getByLabelText('Status do lançamento'),
            'SETTLED',
        );
        await user.type(
            screen.getByLabelText('Valor realizado em reais (opcional)'),
            '29,50',
        );
        await user.click(screen.getByRole('button', { name: 'Salvar' }));

        await waitFor(() => {
            expect(fetchMock).toHaveBeenCalledWith(
                '/api/forecast/expense/expense-a',
                expect.objectContaining({
                    method: 'PATCH',
                    body: JSON.stringify({
                        month: '2027-02',
                        status: 'SETTLED',
                        actualAmountInCents: '2950',
                    }),
                }),
            );
        });
    });

    it('hides actual amount when canceling a recurring income', async () => {
        const fetchMock = vi.fn().mockResolvedValue({ ok: true });
        vi.stubGlobal('fetch', fetchMock);
        const user = userEvent.setup();

        render(
            <OccurrenceControl
                kind="income"
                sourceId="income-a"
                month="2027-02"
                initialStatus="PENDING"
            />,
        );

        await user.selectOptions(
            screen.getByLabelText('Status do lançamento'),
            'CANCELED',
        );
        expect(screen.queryByLabelText('Valor realizado em reais (opcional)'))
            .toBeNull();

        await user.click(screen.getByRole('button', { name: 'Salvar' }));

        await waitFor(() => {
            expect(fetchMock).toHaveBeenCalledWith(
                '/api/forecast/income/income-a',
                expect.objectContaining({
                    method: 'PATCH',
                    body: JSON.stringify({
                        month: '2027-02',
                        status: 'CANCELED',
                    }),
                }),
            );
        });
    });
});
