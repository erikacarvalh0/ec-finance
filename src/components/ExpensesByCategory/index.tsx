'use client';

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
};

export function ExpensesByCategory({ categories }: { categories: Category[] }) {
    const positive = categories.filter(category => category.cents > 0);
    const total = positive.reduce((sum, category) => sum + category.cents, 0);
    const data = positive.map((category, index) => ({
        label: category.name,
        color: chartColors[index % chartColors.length],
        percentage: Math.round(category.cents / total * 10000) / 100,
    }));

    return (
        <Card title="Despesas por categoria">
            {total === 0 ? (
                <p>Nenhuma despesa por categoria neste mês.</p>
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
