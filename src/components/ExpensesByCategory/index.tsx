'use client';

import Link from 'next/link';
import overviewStyles from '@/components/dashboard/overview-details.module.css';
import dashboardStyles from '@/components/DashboardLayout/index.module.css';
import { Card } from '@erikacarvalho/react/Card';
import { Chart } from '@erikacarvalho/react/Chart';
import { chartColors } from '@/lib/chart-colors';

const currency = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
});

type Category = {
    name: string;
    cents: number;
    color?: string;
};

export function ExpensesByCategory({ categories }: { categories: Category[] }) {
    const positive = categories.filter(category => category.cents > 0);
    const total = positive.reduce((sum, category) => sum + category.cents, 0);
    const data = positive.map((category, index) => ({
        label: category.name,
        color: category.color && /^#[0-9a-fA-F]{6}$/.test(category.color) ? category.color : chartColors[index % chartColors.length],
        percentage: Math.round(category.cents / total * 10000) / 100,
    }));

    return (
        <Card customClass={`${dashboardStyles.card} ${dashboardStyles.chartCard}`} title="Despesas por categoria">
            {total === 0 ? (
                <div className={overviewStyles['dashboard-overview']}>
                    <div className={overviewStyles['dashboard-overview__empty-state']}>
                        <p>Nenhuma despesa por categoria neste mês.</p>
                        <Link href="/expenses" className={overviewStyles['dashboard-overview__outline-action']}>
                            Adicionar despesa
                        </Link>
                    </div>
                </div>
            ) : (
                <>
                    <Chart
                        config={{
                            type: 'pie',
                            donut: true,
                            centerLabel: currency.format(total / 100),
                        }}
                        data={data}
                    />
                    <ul>
                        {positive.map((category, index) => (
                            <li key={index}>
                                {category.name}: {currency.format(category.cents / 100)}
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </Card>
    );
}
