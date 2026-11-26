'use client';
import dashboardStyles from '@/components/DashboardLayout/index.module.css';
import { Card } from '@erikacarvalho/react/Card';
import { Chart } from '@erikacarvalho/react/Chart';

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function CashflowChart({ income, expenses }: { income: number; expenses: number }) {
    return <Card customClass={`${dashboardStyles.card} ${dashboardStyles.chartCard}`} title="Fluxo de caixa do mês">
        {income === 0 && expenses === 0 ? <p>Nenhuma movimentação registrada neste mês.</p> :
            <Chart config={{ type: 'column' }} data={{ Entradas: [income / 100], Despesas: [expenses / 100] }} />}
        <p>Entradas: {currency.format(income / 100)} · Despesas: {currency.format(expenses / 100)}</p>
    </Card>;
}
