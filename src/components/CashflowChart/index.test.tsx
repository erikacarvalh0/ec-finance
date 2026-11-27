// @vitest-environment jsdom
import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { CashflowChart } from './index';
vi.mock('@erikacarvalho/react/Card', () => ({ Card: ({children}: {children: ReactNode}) => <article>{children}</article> }));
vi.mock('@erikacarvalho/react/Chart', () => ({ Chart: ({data}: {data: unknown}) => <div data-testid="chart">{JSON.stringify(data)}</div> }));
afterEach(cleanup);
it('passes recorded amounts in reais to ECDS', () => {
    render(<CashflowChart income={450000} expenses={520000} />);
    expect(screen.getByTestId('chart').textContent).toBe(JSON.stringify({Entradas:[4500],Despesas:[5200]}));
});
it('formats the displayed amounts in Brazilian currency without changing chart data', () => {
    render(<CashflowChart income={1900000} expenses={10000} />);
    const plot = screen.getByTestId('chart').parentElement!;
    expect(plot.style.getPropertyValue('--cashflow-income-label')).toBe(JSON.stringify(new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(19000)));
    expect(plot.style.getPropertyValue('--cashflow-expenses-label')).toBe(JSON.stringify(new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(100)));
});
it('shows an empty state without plotting zero amounts', () => {
    render(<CashflowChart income={0} expenses={0} />);
    expect(screen.queryByTestId('chart')).toBeNull();
    expect(screen.getByText('Nenhuma movimentação registrada neste mês.')).toBeTruthy();
});
