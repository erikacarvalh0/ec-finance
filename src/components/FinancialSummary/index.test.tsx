// @vitest-environment jsdom
import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, it, expect, vi } from 'vitest';
import type { ReactNode } from 'react';
import { FinancialSummary } from './index';
import { FinancialOverview } from '../FinancialOverview';

vi.mock('@erikacarvalho/react/Card', () => ({
    Card: ({ children }: { children: ReactNode }) => <article>{children}</article>,
}));

vi.mock('@erikacarvalho/react/Icons', () => ({
    ArrowUp: () => null,
    ArrowDown: () => null,
    Wallet: () => null,
    Calendar: () => null,
    CreditCard: () => null,
}));

afterEach(cleanup);

it('renders all three recorded metrics', () => {
    render(<FinancialSummary income={10000} expenses={20000} balance={-10000} />);
    expect(screen.getAllByRole('heading')).toHaveLength(3);
    expect(screen.getByText(/-R\$\s*100,00/)).toBeTruthy();
});

it('renders overdue count and review link', () => {
    render(<FinancialOverview fixed={0} overdue={100} count={1} transactions={0} />);
    expect(screen.getByText('1 ocorrência pendente')).toBeTruthy();
    expect(screen.getByRole('link').getAttribute('href')).toBe('/forecast');
});
