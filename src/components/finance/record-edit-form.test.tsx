// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RecordEditForm } from './record-edit-form';
import { EndRecurrenceForm } from './end-recurrence-form';

vi.mock('next/navigation', () => ({
    useRouter: () => ({ refresh: vi.fn() }),
}));

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

describe('finance editing interface', () => {
    it('allows opening an editable expense with its previous values', async () => {
        const user = userEvent.setup();

        render(<RecordEditForm record={{
            kind: 'expense',
            id: 'expense-a',
            description: 'Internet',
            amountInCents: '9900',
            type: 'FIXED',
            paymentMethod: 'PIX',
            date: '2026-11-15',
            installments: 1,
            endsOn: '',
        }} />);

        await user.click(screen.getByRole('button', { name: 'Editar' }));

        expect((screen.getByLabelText('Descrição') as HTMLInputElement).value)
            .toBe('Internet');
        expect((screen.getByLabelText('Valor (R$)') as HTMLInputElement).value)
            .toBe('99.00');
        expect(screen.getByLabelText('Encerrar recorrência em')).toBeTruthy();
    });

    it('requires recurring income details when changing type', async () => {
        const user = userEvent.setup();

        render(<RecordEditForm record={{
            kind: 'income',
            id: 'income-a',
            amountInCents: '40000',
            type: 'OTHER',
            responsible: '',
            description: '',
            date: '',
            endsOn: '',
        }} />);

        await user.click(screen.getByRole('button', { name: 'Editar' }));
        await user.selectOptions(screen.getByLabelText('Tipo'), 'RECURRING');

        expect(screen.getByLabelText('Responsável')).toBeTruthy();
        expect(screen.getByLabelText('Data inicial')).toBeTruthy();
    });

    it('ends a recurring expense through the dedicated endpoint', async () => {
        const user = userEvent.setup();
        const mockedFetch = vi.fn().mockResolvedValue({ ok: true });
        vi.stubGlobal('fetch', mockedFetch);

        render(<EndRecurrenceForm
            kind="expense"
            id="expense-a"
            currentDate="2027-01-31"
        />);

        await user.click(screen.getByRole('button', { name: 'Encerrar' }));

        await waitFor(() => {
            expect(mockedFetch).toHaveBeenCalledWith(
                '/api/recurrences/expense/expense-a/end',
                expect.objectContaining({
                    method: 'PATCH',
                    body: JSON.stringify({ endsOn: '2027-01-31' }),
                }),
            );
        });
    });
});
