// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ExpenseEdit } from './index';

afterEach(cleanup);

it('defaults to the current installment and passes the selected scope explicitly', () => {
    const save = vi.fn();
    render(<ExpenseEdit onSave={save}><input name="description" defaultValue="Compra" /></ExpenseEdit>);
    expect((screen.getByLabelText('Somente esta parcela') as HTMLInputElement).checked).toBe(true);
    fireEvent.click(screen.getByLabelText('Esta parcela e as pendentes'));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));
    expect(save).toHaveBeenCalledWith('CURRENT_AND_PENDING', expect.any(FormData));
});
