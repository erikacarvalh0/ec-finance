// @vitest-environment jsdom
import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { MetricCard } from './metric-card';
afterEach(cleanup);
it('renders the supplied recorded amount and label', () => {
    render(<MetricCard label="Receitas registradas" value="R$ 100,00" />);
    expect(screen.getByRole('heading', { name: 'Receitas registradas' })).toBeTruthy();
    expect(screen.getByText('R$ 100,00')).toBeTruthy();
});
