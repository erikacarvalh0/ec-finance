// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { ExpenseFilters } from './index';

afterEach(cleanup);

it('preserves active filters and archive view', () => {
    render(<ExpenseFilters archived search="mercado" type="FIXED" paymentMethod="PIX" />);
    const form = screen.getByRole('button', { name: 'Aplicar filtros' }).closest('form')!;
    const data = new FormData(form);
    expect(data.get('view')).toBe('archived');
    expect(data.get('search')).toBe('mercado');
    expect(data.get('type')).toBe('FIXED');
    expect(data.get('paymentMethod')).toBe('PIX');
});
