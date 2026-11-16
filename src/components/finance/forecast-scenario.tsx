'use client';
import { useMemo, useState } from 'react';
import { Input } from '@erikacarvalho/react';
import { simulateCashflow } from '@/modules/forecast/scenarios';

type Month = { period: string; incomeInCents: string; expenseInCents: string };
const format = (amount: bigint) => new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL',
}).format(Number(amount) / 100);

export function ForecastScenario({ months }: { months: Month[] }) {
    const [incomeChangePercent, setIncomeChangePercent] = useState(0);
    const [expenseChangePercent, setExpenseChangePercent] = useState(0);
    const scenario = useMemo(() => simulateCashflow(
        months.map(month => ({
            period: month.period,
            incomeInCents: BigInt(month.incomeInCents),
            expenseInCents: BigInt(month.expenseInCents),
        })),
        { incomeChangePercent, expenseChangePercent },
    ), [months, incomeChangePercent, expenseChangePercent]);

    return (
        <section aria-label="Simular cenários financeiros">
            <h2>Simulação de cenários</h2>
            <p>Experimente mudanças percentuais nas entradas e despesas previstas. Os valores são apenas simulações e não alteram seus lançamentos.</p>
            <div className="finance-form">
                <label>
                    Mudança nas entradas (%)
                    <Input type="number" min={-100} max={1000} step={1}
                        value={incomeChangePercent}
                        onChange={event => setIncomeChangePercent(Number(event.currentTarget.value))} />
                </label>
                <label>
                    Mudança nas despesas (%)
                    <Input type="number" min={-100} max={1000} step={1}
                        value={expenseChangePercent}
                        onChange={event => setExpenseChangePercent(Number(event.currentTarget.value))} />
                </label>
            </div>
            <div className="table-scroll">
                <table>
                    <thead>
                        <tr><th>Mês</th><th>Saldo original</th><th>Saldo simulado</th><th>Diferença acumulada</th></tr>
                    </thead>
                    <tbody>
                        {scenario.map(month => (
                            <tr key={month.period}>
                                <td>{month.period}</td>
                                <td>{format(month.baselineBalanceInCents)}</td>
                                <td>{format(month.simulatedBalanceInCents)}</td>
                                <td>{format(month.cumulativeImpactInCents)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
}
