'use client';

import { ArrowUp, ArrowDown, Wallet } from '@erikacarvalho/react/Icons';
import dashboardStyles from '@/components/DashboardLayout/index.module.css';
import { MetricCard } from '../MetricCard';

const money = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
});

type FinancialSummaryProps = {
    income: number;
    expenses: number;
    balance: number;
};

export function FinancialSummary({ income, expenses, balance }: FinancialSummaryProps) {
    return (
        <section aria-label="Resumo financeiro" className={dashboardStyles.metrics}>
            <MetricCard
                title="Receitas registradas"
                value={money.format(income / 100)}
                icon={<ArrowUp />}
            />
            <MetricCard
                title="Despesas registradas"
                value={money.format(expenses / 100)}
                icon={<ArrowDown />}
            />
            <MetricCard
                title="Saldo do mês"
                value={money.format(balance / 100)}
                icon={<Wallet />}
            />
        </section>
    );
}
