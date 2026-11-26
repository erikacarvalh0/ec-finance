import dashboardStyles from '@/components/DashboardLayout/index.module.css';
import Link from 'next/link';
import { CashflowChart } from '@/components/CashflowChart';
import { ExpensesByCategory } from '@/components/ExpensesByCategory';
import { FinancialSummary } from '@/components/FinancialSummary';
import { FinancialOverview } from '@/components/FinancialOverview';
import { DashboardHeader } from '@/components/DashboardHeader';
import { Page } from '@/components/Page';
import { redirect } from 'next/navigation';
import { Card } from '@/components/ecds-v1/compat';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getMonthlyFixedExpenses } from '@/modules/finance/monthly';
import { getUserCashflowForecast } from '@/modules/forecast/repository';
import { getOverdueExpenseTotals } from '@/modules/forecast/overdue';
import { getCategoryBudgetReport } from '@/modules/budgets/service';
import { MarkFixedButton } from '@/components/finance/forms';
import { getUserMonthlyCashflowReport } from '@/modules/reports/monthly';
import { summarizeDashboardRecordedCashflow } from '@/modules/reports/dashboard-cashflow';

export const dynamic = 'force-dynamic';

const currency = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
});

function formatCents(value: bigint): string {
    return currency.format(Number(value) / 100);
}

export default async function DashboardPage({
    searchParams,
}: {
    searchParams: Promise<{ month?: string | string[] }>;
}) {
    const session = await auth();

    if (!session?.user?.id) {
        redirect('/sign-in');
    }

    const userId = session.user.id;
    const now = new Date();
    const requested = (await searchParams).month;
    const valid = typeof requested === 'string' && /^[1-9]\d{3}-(0[1-9]|1[0-2])$/.test(requested);
    const year = valid ? Number(requested.slice(0, 4)) : now.getUTCFullYear();
    const month = valid ? Number(requested.slice(5)) : now.getUTCMonth() + 1;
    const selectedMonth = new Date(Date.UTC(year, month - 1, 1));
    const [fixed, transactions, forecast, recentMonths, budgetReport, recordedMonths] = await Promise.all([
        getMonthlyFixedExpenses(prisma, userId, year, month),
        prisma.transaction.findMany({
            where: {
                userId,
                occurredAt: {
                    gte: new Date(Date.UTC(year, month - 1, 1)),
                    lt: new Date(Date.UTC(year, month, 1)),
                },
            },
            orderBy: { occurredAt: 'desc' },
            take: 25,
            select: {
                id: true,
                description: true,
                amountInCents: true,
                isFixed: true,
                occurredAt: true,
            },
        }),
        getUserCashflowForecast(prisma, userId, selectedMonth, 6),
        getUserCashflowForecast(
            prisma,
            userId,
            new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 6, 1)),
            7,
        ),
        getCategoryBudgetReport(prisma, userId, `${year}-${String(month).padStart(2, '0')}`),
        getUserMonthlyCashflowReport(prisma, userId, new Date(Date.UTC(year, month - 1, 1)), 1),
    ]);
    const recorded = summarizeDashboardRecordedCashflow(recordedMonths);
    const overdue = getOverdueExpenseTotals(
        recentMonths.flatMap((item) => item.expenses),
        now,
    );

    return (
        <Page mainClassName={dashboardStyles.main}>
            <div className={dashboardStyles.dashboard}>
                <DashboardHeader
                    name={session.user.name ?? session.user.email}
                    month={`${year}-${String(month).padStart(2, '0')}`}
                />
                <FinancialSummary
                    income={Number(recorded.incomeInCents)}
                    expenses={Number(recorded.expenseInCents)}
                    balance={Number(recorded.netInCents)}
                />
                <section className={dashboardStyles.charts} aria-label="Gráficos financeiros">
                <CashflowChart
                    income={Number(recorded.incomeInCents)}
                    expenses={Number(recorded.expenseInCents)}
                />
                <ExpensesByCategory
                    categories={budgetReport.categories.map(category => ({
                        name: category.name,
                        cents: Number(category.spentInCents),
                    }))}
                />
                </section>
                <FinancialOverview
                    fixed={Number(fixed.totalInCents)}
                    overdue={Number(overdue.totalInCents)}
                    count={overdue.count}
                    transactions={transactions.length}
                />
                <Card padding="lg" className={dashboardStyles.card}>
                    <h2>Orçamentos deste mês</h2>
                    {budgetReport.categories.length === 0 ? (
                        <p>Nenhuma categoria cadastrada.</p>
                    ) : (
                        <ul>
                            {budgetReport.categories.map((category) => (
                                <li key={category.categoryId}>
                                    <strong>{category.name}</strong>
                                    {': '}
                                    {formatCents(category.spentInCents)}
                                    {' / '}
                                    {category.limitInCents === null
                                        ? 'Sem limite'
                                        : formatCents(category.limitInCents)}
                                    {category.status === 'OVER_LIMIT' && ' · Acima do limite'}
                                    {category.status === 'AT_LIMIT' && ' · Limite atingido'}
                                    {category.status === 'NEAR_LIMIT' && ' · Próximo do limite'}
                                </li>
                            ))}
                        </ul>
                    )}
                    <Link href="/budgets">Gerenciar limites e categorias</Link>
                </Card>
                <Card padding="lg" className={dashboardStyles.card}>
                    <h2>Previsão dos próximos meses</h2>
                    <p>
                        Parcelas e recorrências calculadas a partir dos registros existentes.
                        São previsões, não cobranças confirmadas.
                    </p>
                    <div className="table-scroll">
                        <table>
                            <thead>
                                <tr>
                                    <th>Mês</th>
                                    <th>Despesas previstas</th>
                                    <th>Entradas previstas</th>
                                    <th>Saldo projetado</th>
                                    <th>Realizado</th>
                                    <th>Pendente</th>
                                </tr>
                            </thead>
                            <tbody>
                                {forecast.map((month) => (
                                    <tr key={`${month.year}-${month.month}`}>
                                        <td>{String(month.month).padStart(2, '0')}/{month.year}</td>
                                        <td>{formatCents(month.expenseTotalInCents)}</td>
                                        <td>{formatCents(month.incomeTotalInCents)}</td>
                                        <td>{formatCents(month.balanceInCents)}</td>
                                        <td>{formatCents(month.settledIncomeInCents - month.settledExpenseInCents)}</td>
                                        <td>{formatCents(month.pendingIncomeInCents - month.pendingExpenseInCents)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <Link href="/forecast">Ver detalhes do planejamento</Link>
                </Card>
                <Card padding="lg" className={dashboardStyles.card}>
                    <h2>Despesas fixas do mês</h2>
                    {fixed.expenses.length + fixed.cardTransactions.length === 0 ? (
                        <p>Nenhuma despesa fixa encontrada para este mês.</p>
                    ) : (
                        <ul>
                            {fixed.expenses.map((expense) => (
                                <li key={expense.id}>
                                    {expense.description}: {formatCents(expense.amountInCents)}
                                </li>
                            ))}
                            {fixed.cardTransactions.map((expense) => (
                                <li key={expense.id}>
                                    {expense.description} (cartão): {formatCents(expense.amountInCents)}
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>
                <Card padding="lg" className={dashboardStyles.card}>
                    <h2>Compras do cartão</h2>
                    {transactions.length === 0 ? (
                        <p>Nenhuma compra de cartão registrada neste mês.</p>
                    ) : (
                        <div className="table-scroll">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Descrição</th>
                                        <th>Valor</th>
                                        <th>Classificação</th>
                                        <th>Ação</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {transactions.map((transaction) => (
                                        <tr key={transaction.id}>
                                            <td>{transaction.description}</td>
                                            <td>{formatCents(transaction.amountInCents)}</td>
                                            <td>{transaction.isFixed ? 'Fixa' : 'Variável'}</td>
                                            <td>
                                                {!transaction.isFixed && (
                                                    <MarkFixedButton transactionId={transaction.id} />
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card>
            </div>
        </Page>
    );
}
