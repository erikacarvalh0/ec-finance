import { Calendar, Wallet } from '@erikacarvalho/react/Icons';
import type { summarizeIncomeCharts } from '@/modules/income/charts';
import styles from './index.module.css';

type Data = ReturnType<typeof summarizeIncomeCharts>;
const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const monthLabel = new Intl.DateTimeFormat('pt-BR', { month: 'short', timeZone: 'UTC' });
const percent = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 1 });
const format = (cents: bigint) => money.format(Number(cents) / 100);

export function IncomeEvolutionChart({ months }: { months: Data['months'] }) {
    const max = Math.max(1, ...months.map(month => Number(month.cents) / 100));
    const step = Math.pow(10, Math.floor(Math.log10(max / 4)));
    const ceiling = Math.ceil(max / (4 * step)) * 4 * step;
    return (
        <article className={styles['income-charts__card']}>
            <h2><Calendar />Evolução das entradas</h2>
            <svg viewBox="0 0 520 240" role="img" aria-label="Evolução das receitas registradas nos últimos seis meses" className={styles['income-charts__bars']}>
                {Array.from({ length: 5 }, (_, index) => {
                    const y = 20 + index * 45;
                    return <g key={index}><line x1="100" x2="510" y1={y} y2={y} stroke="#E7ECF2" /><text x="92" y={y + 4} textAnchor="end">{money.format(ceiling * (4 - index) / 4)}</text></g>;
                })}
                {months.map((month, index) => {
                    const height = Number(month.cents) / 100 / ceiling * 180;
                    const x = 112 + index * 67;
                    const y = 200 - height;
                    const radius = Math.min(4, height / 2);
                    return <g key={month.date.toISOString()}>
                        <title>{monthLabel.format(month.date)}: {format(month.cents)}</title>
                        <path fill="#19B8AA" d={`M ${x} 200 V ${y + radius} Q ${x} ${y} ${x + radius} ${y} H ${x + 44 - radius} Q ${x + 44} ${y} ${x + 44} ${y + radius} V 200 Z`} />
                        <text x={x + 22} y="222" textAnchor="middle">{monthLabel.format(month.date)}</text>
                    </g>;
                })}
            </svg>
            <ul className={styles['income-charts__sr-only']}>{months.map(month => <li key={month.date.toISOString()}>{monthLabel.format(month.date)}: {format(month.cents)}</li>)}</ul>
        </article>
    );
}

export function IncomeDistributionChart({ types, total }: Pick<Data, 'types' | 'total'>) {
    let offset = 0;
    const segments = types.map(type => {
        const fraction = total > BigInt(0) ? Number(type.cents) / Number(total) : 0;
        const start = offset;
        offset += fraction;
        return { ...type, fraction, start };
    });
    return (
        <article className={styles['income-charts__card']}>
            <h2><Wallet />Entradas por tipo</h2>
            <div className={styles['income-charts__distribution']}>
                <div className={styles['income-charts__donut']}>
                    <svg viewBox="0 0 200 200" aria-hidden="true">
                        <circle cx="100" cy="100" r="84" fill="none" stroke="#E7ECF2" strokeWidth="30" />
                        {segments.filter(segment => segment.fraction > 0).map(segment => <circle key={segment.type} cx="100" cy="100" r="84" fill="none" stroke={segment.color} strokeWidth="30" pathLength="100" strokeDasharray={`${segment.fraction * 100} ${(1 - segment.fraction) * 100}`} strokeDashoffset={-segment.start * 100} transform="rotate(-90 100 100)" />)}
                    </svg>
                    <div className={styles['income-charts__center']}><strong>{format(total)}</strong><span>Total</span></div>
                </div>
                <ul className={styles['income-charts__legend']}>
                    {segments.map(segment => <li key={segment.type}><svg width="12" height="12" aria-hidden="true"><circle cx="6" cy="6" r="6" fill={segment.color} /></svg><span>{segment.name}</span><strong>{percent.format(segment.fraction)}</strong></li>)}
                </ul>
            </div>
            {total === BigInt(0) && <p>Nenhuma entrada registrada neste mês.</p>}
        </article>
    );
}

export function IncomeCharts({ data }: { data: Data }) {
    return <section aria-label="Gráficos de entradas" className={styles['income-charts']}><IncomeEvolutionChart months={data.months} /><IncomeDistributionChart types={data.types} total={data.total} /></section>;
}
