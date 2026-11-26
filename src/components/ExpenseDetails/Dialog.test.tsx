// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { ExpenseDetailsDialog } from './Dialog';

vi.mock('@erikacarvalho/react/Dialog', () => ({
    Dialog: ({ isOpen, title, headerActions, children }: { isOpen: boolean; title: string; headerActions: ReactNode; children: ReactNode }) =>
        isOpen ? <section role="dialog"><header>{title}{headerActions}</header>{children}</section> : null,
}));
vi.mock('@/components/finance/expense-archive-button', () => ({
    ExpenseArchiveButton: () => <button>Arquivar</button>,
}));
afterEach(cleanup);

it('opens details with the archive action in the header', () => {
    render(<ExpenseDetailsDialog id="expense" archived={false} expense={{
        description: 'Compra', amount: 'R$ 10', type: 'Variável', category: 'Casa',
        paymentMethod: 'Pix', date: '26/11/2026', installments: '1', status: 'Pendente',
    }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ver detalhes' }));
    expect(screen.getByRole('dialog').querySelector('header')?.textContent).toContain('Arquivar');
    expect(screen.getByText('Compra')).toBeTruthy();
});
