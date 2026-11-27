'use client';

import dashboardStyles from '@/components/DashboardLayout/index.module.css';
import { Card } from '@erikacarvalho/react/Card';
import { Chart } from '@erikacarvalho/react/Chart';
import styles from './index.module.css';

const currency = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
});

export function CashflowChart({ income, expenses }: { income: number; expenses: number }) {
    return (
        <Card
            customClass={`${dashboardStyles.card} ${styles['cashflow-chart']}`}
            title="Fluxo de caixa do mês"
        >
            {income === 0 && expenses === 0 ? (
                <p>Nenhuma movimentação registrada neste mês.</p>
            ) : (
                <div className={styles['cashflow-chart__plot']}>
                    <Chart
                        config={{ type: 'column' }}
                        data={{ Entradas: [income / 100], Despesas: [expenses / 100] }}
                    />
                </div>
            )}
            <p className={styles['cashflow-chart__summary']}>
                <span>Entradas: {currency.format(income / 100)}</span>
                <span aria-hidden="true"> · </span>
                <span>Despesas: {currency.format(expenses / 100)}</span>
            </p>
        </Card>
    );
}
