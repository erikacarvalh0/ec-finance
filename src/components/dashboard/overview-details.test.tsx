// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OverviewDetails } from './overview-details';

vi.mock('next/link', () => ({
    default: ({ href, children, ...props }: { href: string; children: React.ReactNode; className?: string }) =>
        <a href={href} {...props}>{children}</a>,
}));
vi.mock('@erikacarvalho/react/Icons', () => ({
    Calendar: () => <svg aria-hidden="true" />,
    CreditCard: () => <svg aria-hidden="true" />,
}));
vi.mock('@/components/finance/forms', () => ({
    MarkFixedButton: ({ transactionId }: { transactionId: string }) => <button>Marcar {transactionId}</button>,
}));

const forecast = [{
    year: 2026, month: 11, expenseTotalInCents: 10000n, incomeTotalInCents: 30000n,
    balanceInCents: 20000n, settledIncomeInCents: 10000n, settledExpenseInCents: 2000n,
    pendingIncomeInCents: 20000n, pendingExpenseInCents: 8000n,
}];
const base = {
    forecast, categories: [], fixedExpenses: [], fixedCardTransactions: [], cardTransactions: [],
    selectedPeriod: '2026-11',
};

afterEach(cleanup);

describe('OverviewDetails', () => {
    it('renders a full comparison table and highlights the selected month', () => {
        render(<OverviewDetails {...base} />);
        const table = screen.getByRole('table');
        expect(within(table).getAllByRole('columnheader')).toHaveLength(6);
        expect(within(table).getByText('Atual')).toBeTruthy();
        expect(within(table).getByText('R$ 200,00')).toBeTruthy();
        expect(screen.getByRole('link', { name: /Ver planejamento/ }).getAttribute('href')).toBe('/forecast');
    });

    it('shows compact empty states with actionable links', () => {
        render(<OverviewDetails {...base} />);
        expect(screen.getByText('Nenhuma despesa fixa neste mês.')).toBeTruthy();
        expect(screen.getByText('Nenhuma compra de cartão registrada neste mês.')).toBeTruthy();
        expect(screen.getByRole('link', { name: 'Adicionar despesa fixa' }).getAttribute('href')).toBe('/expenses');
        expect(screen.getByRole('link', { name: 'Registrar compra' }).getAttribute('href')).toBe('/expenses');
    });

    it('only shows budget progress when a limit exists', () => {
        render(<OverviewDetails {...base} categories={[
            { categoryId: 'a', name: 'Alimentação', spentInCents: 5000n,
                limitInCents: null, percentage: null, status: 'NO_BUDGET',
                color: '#128078', iconBackground: '#e1f4f0', icon: 'shopping-cart' },
            { categoryId: 'b', name: 'Moradia', spentInCents: 5000n,
                limitInCents: 10000n, percentage: 50, status: 'ON_TRACK',
                color: '#128078', iconBackground: '#e1f4f0', icon: 'house' },
        ]} />);
        expect(screen.getAllByRole('progressbar')).toHaveLength(1);
        expect(screen.getByRole('link', { name: 'Definir limite' }).getAttribute('href')).toBe('/budgets?period=2026-11');
        expect(screen.getByRole('progressbar').getAttribute('aria-label')).toBe('Consumo do orçamento Moradia');
    });

    it('renders recorded card purchases and preserves the fixed action', () => {
        render(<OverviewDetails {...base} cardTransactions={[{
            id: 'tx-1', description: 'Mercado', amountInCents: 9000n, isFixed: false,
            occurredAt: new Date('2026-11-12T00:00:00.000Z'), cardId: 'card-1',
        }]} />);
        expect(screen.getByText('Mercado')).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Marcar tx-1' })).toBeTruthy();
        expect(screen.getByRole('link', { name: /Ver todas/ }).getAttribute('href')).toBe('/cards');
    });
});
