'use client';

import { Calendar, CreditCard, Wallet } from '@erikacarvalho/react/Icons';
import Link from 'next/link';
import dashboardStyles from '@/components/DashboardLayout/index.module.css';
import { MetricCard } from '../MetricCard';

const money = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
});

type FinancialOverviewProps = {
    fixed: number;
    overdue: number;
    count: number;
    transactions: number;
};

export function FinancialOverview({ fixed, overdue, count, transactions }: FinancialOverviewProps) {
    return (
        <section aria-label="Indicadores complementares" className={dashboardStyles.metrics}>
            <MetricCard
                variant="lower"
                title="Despesas fixas deste mês"
                value={money.format(fixed / 100)}
                icon={<Wallet />}
            />
            <MetricCard
                variant="lower"
                title="Despesas atrasadas"
                value={money.format(overdue / 100)}
                icon={<Calendar />}
            >
                <p>{count} ocorrência(s) pendente(s)</p>
                <Link href="/forecast">Revisar pagamentos</Link>
            </MetricCard>
            <MetricCard
                variant="lower"
                title="Lançamentos de cartão do mês"
                value={String(transactions)}
                icon={<CreditCard />}
            />
        </section>
    );
}
