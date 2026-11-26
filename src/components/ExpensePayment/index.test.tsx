// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ExpensePayment } from './index';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

it.each([false, true])('updates only the selected month (paid=%s)', async (paid) => {
    const request = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', request);
    render(<ExpensePayment id="expense" month="2026-11" paid={paid} />);
    fireEvent.click(screen.getByRole('button', { name: paid ? 'Marcar como pendente' : 'Marcar como paga' }));
    expect(request).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    await waitFor(() => expect(request).toHaveBeenCalledWith('/api/forecast/expense/expense', expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ month: '2026-11', status: paid ? 'PENDING' : 'SETTLED' }),
    })));
});
