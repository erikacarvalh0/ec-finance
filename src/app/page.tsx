import Link from 'next/link';
import { ExpensesByCategory } from '@/components/ExpensesByCategory';
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

export default async function DashboardPage() {
    const session = await auth();

    if (!session?.user?.id) {
        redirect('/sign-in');
    }

    const userId = session.user.id;
    const now = new Date();
    const month = now.getUTCMonth() + 1;
    const year = now.getUTCFullYear();
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
        getUserCashflowForecast(prisma, userId, now, 6),
        getUserCashflowForecast(
            prisma,
            userId,
            new Date(Date.UTC(year, month - 7, 1)),
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
        <Page>
                <h1>Visão geral</h1>
                <p>Olá, {session.user.name ?? session.user.email ?? 'bem-vindo'}.</p>
                <p>Seus lançamentos ficam associados à sua conta.</p>
                <Card padding="lg">
                    <h2>Fluxo de caixa registrado neste mês</h2>
                    {!recorded.hasRecords ? (
                        <p>Nenhuma receita ou despesa registrada neste mês.</p>
                    ) : (
                        <div className="grid">
                            <div>
                                <strong>Receitas registradas</strong>
                                <p className="metric">{formatCents(recorded.incomeInCents)}</p>
                            </div>
                            <div>
                                <strong>Despesas registradas</strong>
                                <p className="metric">{formatCents(recorded.expenseInCents)}</p>
                            </div>
                            <div>
                                <strong>Saldo registrado</strong>
                                <p className="metric">{formatCents(recorded.netInCents)}</p>
                            </div>
                        </div>
                    )}
                    <p>Valores registrados na sua conta; não incluem projeções futuras.</p>
                    <Link href="/reports">Ver relatórios detalhados</Link>
                </Card>
                <div className="grid">
                    <Card padding="lg">
                        <h2>Despesas fixas deste mês</h2>
                        <p className="metric">{formatCents(fixed.totalInCents)}</p>
                        <p>Despesas com data e compras de cartão marcadas como fixas.</p>
                    </Card>
                    <Card padding="lg">
                        <h2>Despesas atrasadas</h2>
                        <p className="metric">{formatCents(overdue.totalInCents)}</p>
                        <p>{overdue.count} ocorrência(s) pendente(s) dos últimos sete meses.</p>
                        <Link href="/forecast">Revisar pagamentos</Link>
                    </Card>
                    <Card padding="lg">
                        <h2>Lançamentos de cartão do mês</h2>
                        <p className="metric">{transactions.length}</p>
                        <p>Compras reconhecidas e disponíveis para classificação.</p>
                    </Card>
                </div>
                <ExpensesByCategory categories={budgetReport.categories.map(category => ({name:category.name,cents:Number(category.spentInCents)}))} />
                <Card padding="lg">
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
                <Card padding="lg">
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
                <Card padding="lg">
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
                <Card padding="lg">
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
        </Page>
    );
}
