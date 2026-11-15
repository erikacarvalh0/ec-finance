import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Card } from '@erikacarvalho/react';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getUserCashflowForecast } from '@/modules/forecast/repository';
import { OccurrenceControl } from '@/components/finance/occurrence-control';

export const dynamic = 'force-dynamic';

const currency = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
});

function formatCents(value: bigint) {
    return currency.format(Number(value) / 100);
}

export default async function ForecastPage() {
    const session = await auth();

    if (!session?.user?.id) {
        redirect('/sign-in');
    }

    const months = await getUserCashflowForecast(
        prisma,
        session.user.id,
        new Date(),
        6,
    );

    return (
        <main className="finance-page">
            <Link href="/">← Voltar ao dashboard</Link>
            <h1>Planejamento financeiro</h1>
            <p>
                Próximos seis meses com parcelas, despesas fixas e entradas recorrentes.
                Valores previstos não representam pagamentos ou recebimentos confirmados.
            </p>

            <div className="investment-grid">
                {months.map((month) => (
                    <Card
                        key={`${month.year}-${month.month}`}
                        padding="lg"
                    >
                        <h2>
                            {new Date(Date.UTC(month.year, month.month - 1, 1))
                                .toLocaleDateString('pt-BR', {
                                    month: 'long',
                                    year: 'numeric',
                                    timeZone: 'UTC',
                                })}
                        </h2>
                        <p>Saídas previstas: {formatCents(month.expenseTotalInCents)}</p>
                        <p>Entradas previstas: {formatCents(month.incomeTotalInCents)}</p>
                        <p>
                            <strong>Saldo projetado: {formatCents(month.balanceInCents)}</strong>
                        </p>
                        <p>Pagamentos realizados: {formatCents(month.settledExpenseInCents)} · Pendentes: {formatCents(month.pendingExpenseInCents)}</p>
                        <p>Recebimentos realizados: {formatCents(month.settledIncomeInCents)} · Pendentes: {formatCents(month.pendingIncomeInCents)}</p>
                        <h3>Despesas</h3>
                        {month.expenses.length === 0 && <p>Nenhuma despesa prevista.</p>}
                        <ul className="valuation-history">
                            {month.expenses.map((expense) => (
                                <li key={expense.sourceId}>
                                    {expense.description}
                                    {expense.installmentCount > 1 && (
                                        <span>
                                            {' '}({expense.installmentNumber}/{expense.installmentCount})
                                        </span>
                                    )}
                                    {' — '}
                                    {formatCents(expense.effectiveAmountInCents)}
                                    {' · '}{expense.status === 'SETTLED' ? 'Pago' : expense.status === 'CANCELED' ? 'Cancelado' : 'Pendente'}
                                    <OccurrenceControl kind="expense" sourceId={expense.sourceId} month={`${month.year}-${String(month.month).padStart(2, '0')}`} initialStatus={expense.status} />
                                </li>
                            ))}
                        </ul>
                        <h3>Entradas</h3>
                        {month.incomes.length === 0 && <p>Nenhuma entrada prevista.</p>}
                        <ul className="valuation-history">
                            {month.incomes.map((income) => (
                                <li key={income.sourceId}>
                                    {income.description} — {formatCents(income.effectiveAmountInCents)}
                                    {' · '}{income.status === 'SETTLED' ? 'Recebido' : income.status === 'CANCELED' ? 'Cancelado' : 'Pendente'}
                                    <OccurrenceControl kind="income" sourceId={income.sourceId} month={`${month.year}-${String(month.month).padStart(2, '0')}`} initialStatus={income.status} />
                                </li>
                            ))}
                        </ul>
                    </Card>
                ))}
            </div>
        </main>
    );
}
