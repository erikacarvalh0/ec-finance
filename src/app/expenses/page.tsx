import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Card } from '@erikacarvalho/react';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { listExpenses } from '@/modules/finance/service';
import { listUserCards } from '@/modules/cards/service';
import { LinkImportedTransactionForm } from '@/components/cards/card-forms';
import { ExpenseForm } from '@/components/finance/forms';
import { RecordEditForm } from '@/components/finance/record-edit-form';
import { EndRecurrenceForm } from '@/components/finance/end-recurrence-form';

export const dynamic = 'force-dynamic';

const currency = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
});

export default async function ExpensesPage() {
    const session = await auth();

    if (!session?.user?.id) {
        redirect('/sign-in');
    }

    const [expenses, cards, transactions] = await Promise.all([
        listExpenses(prisma, session.user.id),
        listUserCards(prisma, session.user.id),
        prisma.transaction.findMany({
            where: { userId: session.user.id },
            select: {
                id: true,
                cardId: true,
                description: true,
                amountInCents: true,
            },
            orderBy: { occurredAt: 'desc' },
            take: 100,
        }),
    ]);

    return (
        <main className="finance-page">
            <Link href="/">← Voltar ao dashboard</Link>
            <h1>Despesas</h1>
            <ExpenseForm cards={cards} />
            <Card padding="lg">
                <h2>Histórico de despesas</h2>
                {expenses.length === 0 && <p>Nenhuma despesa registrada.</p>}
                <ul className="record-list">
                    {expenses.map((expense) => (
                        <li key={expense.id}>
                            <strong>{expense.description}</strong>
                            <span>{currency.format(Number(expense.amountInCents) / 100)}</span>
                            <small>
                                {expense.type === 'FIXED' ? 'Fixa' : 'Variável'}
                                {' · '}
                                {expense.installments} parcela(s)
                            </small>
                            {expense.type === 'FIXED' && expense.installments === 1 && (
                                <EndRecurrenceForm
                                    kind="expense"
                                    id={expense.id}
                                    currentDate={expense.endsOn?.toISOString().slice(0, 10) ?? ''}
                                />
                            )}
                            {expense.paymentMethod === 'CREDIT'
                                && expense.cardId
                                && !expense.linkedTransactionId && (
                                <LinkImportedTransactionForm
                                    expenseId={expense.id}
                                    transactions={transactions
                                        .filter((transaction) => transaction.cardId === expense.cardId)
                                        .map((transaction) => ({
                                            id: transaction.id,
                                            description: transaction.description,
                                            amountInCents: transaction.amountInCents.toString(),
                                        }))}
                                />
                            )}
                            {expense.linkedTransactionId && (
                                <small>Vinculada à compra importada</small>
                            )}
                            <RecordEditForm record={{
                                kind: 'expense',
                                id: expense.id,
                                description: expense.description,
                                amountInCents: expense.amountInCents.toString(),
                                type: expense.type,
                                paymentMethod: expense.paymentMethod,
                                date: expense.date?.toISOString().slice(0, 10) ?? '',
                                installments: expense.installments,
                                endsOn: expense.endsOn?.toISOString().slice(0, 10) ?? '',
                            }} />
                        </li>
                    ))}
                </ul>
            </Card>
        </main>
    );
}
