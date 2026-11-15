import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Button, Card } from '@erikacarvalho/react';
import { auth, signOut } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getMonthlyFixedExpenses } from '@/modules/finance/monthly';
import { MarkFixedButton } from '@/components/finance/forms';

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
    const [fixed, transactions] = await Promise.all([
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
    ]);

    return (
        <div className="layout">
            <aside>
                <strong>ec finance.</strong>
                <nav aria-label="Menu principal" className="side-navigation">
                    <Link href="/">Visão geral</Link>
                    <Link href="/expenses">Despesas</Link>
                    <Link href="/incomes">Entradas</Link>
                    <Link href="/investments">Investimentos</Link>
                </nav>
                <form
                    action={async () => {
                        'use server';

                        await signOut({ redirectTo: '/sign-in' });
                    }}
                >
                    <Button type="submit" variant="ghost">
                        Sair
                    </Button>
                </form>
            </aside>

            <main>
                <h1>Visão geral</h1>
                <p>Olá, {session.user.name ?? session.user.email ?? 'bem-vindo'}.</p>
                <p>Seus lançamentos ficam associados à sua conta.</p>
                <div className="grid">
                    <Card padding="lg">
                        <h2>Despesas fixas deste mês</h2>
                        <p className="metric">{formatCents(fixed.totalInCents)}</p>
                        <p>Despesas com data e compras de cartão marcadas como fixas.</p>
                    </Card>
                    <Card padding="lg">
                        <h2>Lançamentos de cartão do mês</h2>
                        <p className="metric">{transactions.length}</p>
                        <p>Compras reconhecidas e disponíveis para classificação.</p>
                    </Card>
                </div>
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
            </main>
        </div>
    );
}
