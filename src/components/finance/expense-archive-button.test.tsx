// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ExpenseArchiveButton } from './expense-archive-button';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

it('requires confirmation before archiving', () => {
    const request = vi.fn();
    vi.stubGlobal('fetch', request);
    render(<ExpenseArchiveButton id="expense" archived={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'Arquivar' }));
    expect(request).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('button', { name: 'Confirmar' })).toBeNull();
    expect(request).not.toHaveBeenCalled();
});
