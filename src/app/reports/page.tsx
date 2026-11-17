import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Card } from '@erikacarvalho/react';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getUserMonthlyCashflowReport } from '@/modules/reports/monthly';
import { getCategoryBudgetReport } from '@/modules/budgets/service';
import { summarizeCategorySpending } from '@/modules/reports/categories';
import { summarizeAnnualCashflow } from '@/modules/reports/annual';
import { formatReportCurrency as money } from '@/modules/reports/currency';
import { parseReportMonthRange } from '@/modules/reports/filters';

export const dynamic = 'force-dynamic';

export default async function ReportsPage({ searchParams }: {
    searchParams: Promise<{ from?: string; to?: string; category?: string }>;
}) {
    const session = await auth();
    if (!session?.user?.id) redirect('/sign-in');

    const now = new Date();
    const filters = await searchParams;
    let range: ReturnType<typeof parseReportMonthRange>;
    try {
        range = parseReportMonthRange(filters, now);
    } catch {
        range = parseReportMonthRange({}, now);
    }
    const { from, count } = range;
    const categories = await prisma.category.findMany({
        where: { userId: session.user.id }, select: { id: true, name: true }, orderBy: { name: 'asc' },
    });
    const category = typeof filters.category === 'string' && (filters.category === 'uncategorized'
        || categories.some(item => item.id === filters.category)) ? filters.category : undefined;
    const period = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
    const annualFrom = new Date(Date.UTC(now.getUTCFullYear() - 1, 0, 1));
    const [months, annualMonths, categoryReport] = await Promise.all([
        getUserMonthlyCashflowReport(prisma, session.user.id, from, count, category),
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
            <p>Receitas e despesas registradas no período selecionado, sem projeções futuras.</p>
            <form method="get" action="/reports">
                <label>De (AAAA-MM) <input name="from" type="month" defaultValue={range.from.toISOString().slice(0, 7)} required /></label>
                <label>Até (AAAA-MM) <input name="to" type="month" defaultValue={range.lastPeriod} required /></label>
                <label>Categoria <select name="category" defaultValue={category ?? ''}>
                    <option value="">Todas</option>
                    <option value="uncategorized">Sem categoria</option>
                    {categories.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select></label>
                <button type="submit">Filtrar relatório (máximo 12 meses)</button>
            </form>
            <Card padding="lg">
                <h2>{category ? 'Despesas da categoria selecionada' : 'Receitas versus despesas'}</h2>
                {category && <p>Receitas não possuem categoria e não entram neste recorte. O comparativo anual permanece geral.</p>}
                <p><Link href={`/api/reports/cashflow?period=${period}${category ? `&category=${encodeURIComponent(category)}` : ''}`}>Exportar mês atual em CSV</Link></p>
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
