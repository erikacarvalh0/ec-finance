import { ArrowUp, Wallet, Calendar } from '@erikacarvalho/react/Icons';
import type { ReactNode } from 'react';
import type { summarizeIncomes } from '@/modules/income/summary';
import styles from './index.module.css';

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const percent = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 1, signDisplay: 'exceptZero' });

function IncomeSummaryCard({ title, value, icon, tone, detail }: {
    title: string;
    value: string;
    icon: ReactNode;
    tone?: 'positive' | 'negative';
    detail?: string;
}) {
    return (
        <article className={styles['income-summary__card']}>
            <span className={styles['income-summary__icon']} aria-hidden="true">{icon}</span>
            <div>
                <h2>{title}</h2>
                <strong className={tone ? styles[`income-summary__value--${tone}`] : undefined}>{value}</strong>
                {detail && <small>{detail}</small>}
            </div>
        </article>
    );
}

export function IncomeSummary({ summary }: { summary: ReturnType<typeof summarizeIncomes> }) {
    const { total, average, variation, count } = summary;
    return (
        <section aria-label="Indicadores de entradas" className={styles['income-summary']}>
            <IncomeSummaryCard title="Total do mês" value={currency.format(Number(total) / 100)} icon={<Wallet />} />
            <IncomeSummaryCard title="Média mensal" value={currency.format(Number(average) / 100)} icon={<Calendar />} detail="Últimos 6 meses" />
            <IncomeSummaryCard title="Variação" value={variation === null ? '—' : percent.format(variation / 100)} icon={<ArrowUp />} tone={variation === null || variation === 0 ? undefined : variation > 0 ? 'positive' : 'negative'} detail={variation === null ? 'Sem base de comparação' : 'Versus mês anterior'} />
            <IncomeSummaryCard title="Entradas no mês" value={count.toLocaleString('pt-BR')} icon={<ArrowUp />} />
        </section>
    );
}
