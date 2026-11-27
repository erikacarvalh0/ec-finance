import { listManagedCategories } from '@/modules/categories/management';
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
import { Calendar, CreditCard } from '@erikacarvalho/react/Icons';
import overviewStyles from '@/components/dashboard/overview-details.module.css';
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
    const categoryMetadata = await listManagedCategories(prisma, userId);
    const colors = new Map(categoryMetadata.filter(category => category.type === 'EXPENSE').map(category => [category.id, category.color]));
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
                        color: colors.get(category.categoryId),
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
                <section className={overviewStyles['dashboard-overview']} aria-label="Planejamento e acompanhamento financeiro">
                    <Card padding="lg" className={`${dashboardStyles.card} ${overviewStyles['dashboard-overview__card']} ${overviewStyles['dashboard-overview__card--forecast']}`}>
                        <div className={overviewStyles['dashboard-overview__header']}>
                            <h2>Previsão dos próximos meses</h2>
                            <Link href="/forecast" className={overviewStyles['dashboard-overview__link']}>Ver planejamento →</Link>
                        </div>
                        <p>
                            Parcelas e recorrências calculadas a partir dos registros existentes.
                            São previsões, não cobranças confirmadas.
                        </p>
                        <div className={overviewStyles['dashboard-overview__table-scroll']}>
                            <table className={overviewStyles['dashboard-overview__table']}>
                                <thead>
                                    <tr>
                                        <th scope="col">Mês</th>
                                        <th scope="col">Despesas previstas</th>
                                        <th scope="col">Entradas previstas</th>
                                        <th scope="col">Saldo projetado</th>
                                        <th scope="col">Realizado</th>
                                        <th scope="col">Pendente</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {forecast.map((month) => {
                                        const isCurrentMonth = month.year === year && month.month === selectedMonth.getUTCMonth() + 1;
                                        const balanceClass = month.balanceInCents >= BigInt(0)
                                            ? overviewStyles['dashboard-overview__balance--positive']
                                            : overviewStyles['dashboard-overview__balance--negative'];

                                        return (
                                            <tr key={`${month.year}-${month.month}`} className={isCurrentMonth ? overviewStyles['dashboard-overview__row--current'] : undefined}>
                                                <td>{String(month.month).padStart(2, '0')}/{month.year}{isCurrentMonth && <span className={overviewStyles['dashboard-overview__badge']}>Atual</span>}</td>
                                                <td>{formatCents(month.expenseTotalInCents)}</td>
                                                <td>{formatCents(month.incomeTotalInCents)}</td>
                                                <td className={balanceClass}>{formatCents(month.balanceInCents)}</td>
                                                <td>{formatCents(month.settledIncomeInCents - month.settledExpenseInCents)}</td>
                                                <td>{formatCents(month.pendingIncomeInCents - month.pendingExpenseInCents)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                    <div className={overviewStyles['dashboard-overview__tracking']}>
                        <Card padding="lg" className={`${dashboardStyles.card} ${overviewStyles['dashboard-overview__card']} ${overviewStyles['dashboard-overview__card--tracking']}`}>
                            <h2>Orçamentos deste mês</h2>
                            {budgetReport.categories.length === 0 ? (
                                <p className={overviewStyles['dashboard-overview__muted']}>Nenhuma categoria cadastrada.</p>
                            ) : (
                                <ul className={overviewStyles['dashboard-overview__budget-list']}>
                                    {budgetReport.categories.map(category => {
                                        const metadata = categoryMetadata.find(item => item.id === category.categoryId);
                                        return (
                                            <li key={category.categoryId} className={overviewStyles['dashboard-overview__budget-item']}>
                                                <span className={overviewStyles['dashboard-overview__category-icon']} aria-hidden="true"
                                                    style={{ backgroundColor: metadata?.iconBackground ?? '#E5F3EF', color: metadata?.color ?? '#12786F' }}>
                                                    {metadata?.icon === 'house' ? '⌂' : metadata?.icon === 'shopping-cart' ? '🛒' : metadata?.icon === 'car-front' ? '🚗' : metadata?.icon === 'heart' ? '♥' : '▣'}
                                                </span>
                                                <div className={overviewStyles['dashboard-overview__budget-content']}>
                                                    <div className={overviewStyles['dashboard-overview__budget-line']}>
                                                        <strong>{category.name}</strong>
                                                        <strong className={overviewStyles['dashboard-overview__currency']}>{formatCents(category.spentInCents)}</strong>
                                                    </div>
                                                    {category.limitInCents === null ? (
                                                        <div className={overviewStyles['dashboard-overview__budget-line']}>
                                                            <span className={overviewStyles['dashboard-overview__muted']}>Sem limite definido</span>
                                                            <Link href="/budgets" className={overviewStyles['dashboard-overview__link']}>Definir limite</Link>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div className={overviewStyles['dashboard-overview__budget-line']}>
                                                                <span className={overviewStyles['dashboard-overview__muted']}>Limite: {formatCents(category.limitInCents)}</span>
                                                                <span className={overviewStyles['dashboard-overview__muted']}>{category.percentage}% utilizado</span>
                                                            </div>
                                                            <progress className={overviewStyles['dashboard-overview__progress']} max={100} value={Math.min(100, Math.max(0, category.percentage ?? 0))} aria-label={`Orçamento de ${category.name}`} />
                                                            {category.status === 'OVER_LIMIT' && <span>Acima do limite</span>}
                                                            {category.status === 'AT_LIMIT' && <span>Limite atingido</span>}
                                                            {category.status === 'NEAR_LIMIT' && <span>Próximo do limite</span>}
                                                        </>
                                                    )}
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                            <Link href="/budgets" className={overviewStyles['dashboard-overview__footer-link']}>Gerenciar limites e categorias →</Link>
                        </Card>
                        <Card padding="lg" className={`${dashboardStyles.card} ${overviewStyles['dashboard-overview__card']} ${overviewStyles['dashboard-overview__card--tracking']}`}>
                            <h2>Despesas fixas do mês</h2>
                            {fixed.expenses.length + fixed.cardTransactions.length === 0 ? (
                                <div className={overviewStyles['dashboard-overview__empty-state']}>
                                    <span className={overviewStyles['dashboard-overview__empty-icon']} aria-hidden="true"><Calendar /></span>
                                    <p>Nenhuma despesa fixa neste mês.</p>
                                    <Link href="/expenses" className={overviewStyles['dashboard-overview__outline-action']}>Adicionar despesa fixa</Link>
                                </div>
                            ) : (
                                <ul className={overviewStyles['dashboard-overview__scroll-list']}>
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
                        <Card padding="lg" className={`${dashboardStyles.card} ${overviewStyles['dashboard-overview__card']} ${overviewStyles['dashboard-overview__card--tracking']}`}>
                            <div className={overviewStyles['dashboard-overview__header']}>
                                <h2>Compras do cartão</h2>
                                <Link href="/cards" className={overviewStyles['dashboard-overview__link']}>Ver todas →</Link>
                            </div>
                            {transactions.length === 0 ? (
                                <div className={overviewStyles['dashboard-overview__empty-state']}>
                                    <span className={overviewStyles['dashboard-overview__empty-icon']} aria-hidden="true"><CreditCard /></span>
                                    <p>Nenhuma compra de cartão registrada neste mês.</p>
                                    <Link href="/expenses" className={overviewStyles['dashboard-overview__outline-action']}>Registrar compra</Link>
                                </div>
                            ) : (
                                <div className={`table-scroll ${overviewStyles['dashboard-overview__scroll-list']}`}>
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
                </section>
            </div>
        </Page>
    );
}
