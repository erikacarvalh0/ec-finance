// @vitest-environment jsdom
import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { MonthFilter } from './month-filter';
afterEach(cleanup);
it('submits the selected month as a GET parameter', () => {
    render(<MonthFilter month="2026-11" />);
    const field = screen.getByLabelText('Mês') as HTMLInputElement;
    expect(field.value).toBe('2026-11');
    expect(field.name).toBe('month');
    expect(field.form?.method).toBe('get');
});
