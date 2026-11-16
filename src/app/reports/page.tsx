import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Card } from '@erikacarvalho/react';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getUserMonthlyCashflowReport } from '@/modules/reports/monthly';

export const dynamic = 'force-dynamic';

const formatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
function money(cents: bigint) { return formatter.format(Number(cents) / 100); }

export default async function ReportsPage() {
    const session = await auth();
    if (!session?.user?.id) redirect('/sign-in');

    const now = new Date();
    const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1));
    const months = await getUserMonthlyCashflowReport(prisma, session.user.id, from, 6);
    const maximum = months.reduce((max, item) => {
        const value = item.incomeInCents > item.expenseInCents
            ? item.incomeInCents : item.expenseInCents;
        return value > max ? value : max;
    }, BigInt(1));

    return (
        <main className="finance-page">
            <Link href="/">← Voltar ao dashboard</Link>
            <h1>Relatórios financeiros</h1>
            <p>Receitas e despesas registradas nos últimos seis meses, sem projeções futuras.</p>
            <Card padding="lg">
                <h2>Receitas versus despesas</h2>
                <div className="cashflow-chart" role="img" aria-label="Gráfico comparativo mensal de receitas e despesas">
                    {months.map((item) => (
                        <div key={item.period} className="cashflow-chart-month">
                            <div className="cashflow-chart-bars">
                                <div
                                    className="cashflow-bar-income"
                                    title={`Receitas: ${money(item.incomeInCents)}`}
                                    style={{ height: `${Number(item.incomeInCents * BigInt(100) / maximum)}%` }}
                                />
                                <div
                                    className="cashflow-bar-expense"
                                    title={`Despesas: ${money(item.expenseInCents)}`}
                                    style={{ height: `${Number(item.expenseInCents * BigInt(100) / maximum)}%` }}
                                />
                            </div>
                            <small>{item.period.slice(5)}</small>
                        </div>
                    ))}
                </div>
                <p>Verde: receitas · Laranja: despesas</p>
                <div className="table-scroll">
                    <table>
                        <thead>
                            <tr><th>Mês</th><th>Receitas</th><th>Despesas</th><th>Saldo</th></tr>
                        </thead>
                        <tbody>
                            {months.map((item) => (
                                <tr key={item.period}>
                                    <td>{item.period}</td>
                                    <td>{money(item.incomeInCents)}</td>
                                    <td>{money(item.expenseInCents)}</td>
                                    <td>{money(item.netInCents)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </main>
    );
}
