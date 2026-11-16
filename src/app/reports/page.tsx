import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Card } from '@erikacarvalho/react';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getUserMonthlyCashflowReport } from '@/modules/reports/monthly';
import { getCategoryBudgetReport } from '@/modules/budgets/service';
import { summarizeCategorySpending } from '@/modules/reports/categories';
import { summarizeAnnualCashflow } from '@/modules/reports/annual';

export const dynamic = 'force-dynamic';

const formatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
function money(cents: bigint) { return formatter.format(Number(cents) / 100); }

export default async function ReportsPage() {
    const session = await auth();
    if (!session?.user?.id) redirect('/sign-in');

    const now = new Date();
    const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1));
    const period = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
    const annualFrom = new Date(Date.UTC(now.getUTCFullYear() - 1, 0, 1));
    const [months, annualMonths, categoryReport] = await Promise.all([
        getUserMonthlyCashflowReport(prisma, session.user.id, from, 6),
        getUserMonthlyCashflowReport(prisma, session.user.id, annualFrom, 24),
        getCategoryBudgetReport(prisma, session.user.id, period),
    ]);
    const breakdown = summarizeCategorySpending(categoryReport.categories);
    const annual = [now.getUTCFullYear() - 1, now.getUTCFullYear()].map((year) =>
        summarizeAnnualCashflow(year, annualMonths.filter((month) => month.period.startsWith(`${year}-`))),
    );
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
                <p><Link href={`/api/reports/cashflow?period=${period}`}>Exportar mês atual em CSV</Link></p>
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
            <Card padding="lg">
                <h2>Comparativo anual</h2>
                <p>Valores registrados por ano, sem projeções e sem considerar investimentos como renda.</p>
                <p><Link href={`/api/reports/annual?year=${now.getUTCFullYear()}`}>Exportar ano atual em CSV</Link></p>
                <div className="table-scroll">
                    <table>
                        <thead>
                            <tr><th>Ano</th><th>Receitas</th><th>Despesas</th><th>Saldo</th></tr>
                        </thead>
                        <tbody>
                            {annual.map((item) => (
                                <tr key={item.year}>
                                    <td>{item.year}</td>
                                    <td>{money(item.incomeInCents)}</td>
                                    <td>{money(item.expenseInCents)}</td>
                                    <td>{money(item.netInCents)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
            <Card padding="lg">
                <h2>Despesas por categoria — {period}</h2>
                {breakdown.categories.length === 0 ? (
                    <p>Nenhum gasto categorizado registrado neste mês.</p>
                ) : (
                    <>
                        <p><strong>Total categorizado: {money(breakdown.totalInCents)}</strong></p>
                        {breakdown.categories.map((category) => (
                            <div key={category.categoryId} className="category-spending-row">
                                <strong>{category.name}</strong>
                                <span>{money(category.spentInCents)} — {category.percentage}%</span>
                                <progress
                                    max={100}
                                    value={category.percentage}
                                    aria-label={`Participação de ${category.name} nos gastos categorizados`}
                                />
                            </div>
                        ))}
                    </>
                )}
                <p>Gastos sem categoria não entram nesta distribuição.</p>
            </Card>
        </main>
    );
}
