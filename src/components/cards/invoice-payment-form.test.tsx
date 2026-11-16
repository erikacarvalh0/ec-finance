// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InvoicePaymentForm } from './invoice-payment-form';

vi.mock('next/navigation', () => ({
    useRouter: () => ({ refresh: vi.fn() }),
}));

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

describe('invoice payment form', () => {
    it('submits a payment in integer cents using an idempotency key', async () => {
        const user = userEvent.setup();
        const fetchMock = vi.fn().mockResolvedValue({ ok: true });
        vi.stubGlobal('fetch', fetchMock);
        vi.stubGlobal('crypto', { randomUUID: () => 'unique-frontend-payment-key' });

        render(<InvoicePaymentForm
            cardId="card-a"
            period="2026-11"
            remainingInCents="10000"
        />);

        await user.type(screen.getByLabelText('Valor pago (R$)'), '35,50');
        await user.click(screen.getByRole('button', { name: 'Registrar pagamento' }));

        await waitFor(() => {
            expect(fetchMock).toHaveBeenCalledWith(
                '/api/cards/card-a/invoices/2026-11/payments',
                expect.objectContaining({
                    method: 'POST',
                    body: expect.stringContaining('"amountInCents":"3550"'),
                }),
            );
        });

        const submitted = JSON.parse(fetchMock.mock.calls[0][1].body);
        expect(submitted.idempotencyKey).toBe('unique-frontend-payment-key');
    });

    it('rejects a payment above the outstanding balance before sending it', async () => {
        const user = userEvent.setup();
        const fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);

        render(<InvoicePaymentForm
            cardId="card-a"
            period="2026-11"
            remainingInCents="10000"
        />);

        await user.type(screen.getByLabelText('Valor pago (R$)'), '101,00');
        await user.click(screen.getByRole('button', { name: 'Registrar pagamento' }));

        expect(fetchMock).not.toHaveBeenCalled();
        expect(await screen.findByRole('status')).toBeTruthy();
    });

    it('uses the same key to retry a payment after a network failure', async () => {
        const user = userEvent.setup();
        const fetchMock = vi.fn()
            .mockRejectedValueOnce(new Error('Network error'))
            .mockResolvedValueOnce({ ok: true });
        vi.stubGlobal('fetch', fetchMock);
        vi.stubGlobal('crypto', { randomUUID: () => 'stable-retry-payment-key' });

        render(<InvoicePaymentForm
            cardId="card-a"
            period="2026-11"
            remainingInCents="10000"
        />);

        await user.type(screen.getByLabelText('Valor pago (R$)'), '30,00');
        await user.click(screen.getByRole('button', { name: 'Registrar pagamento' }));
        await screen.findByText('Network error');

        await user.click(screen.getByRole('button', { name: 'Registrar pagamento' }));

        await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
        const first = JSON.parse(fetchMock.mock.calls[0][1].body);
        const second = JSON.parse(fetchMock.mock.calls[1][1].body);
        expect(first.idempotencyKey).toBe(second.idempotencyKey);
    });
});
