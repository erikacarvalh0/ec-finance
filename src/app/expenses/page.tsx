import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Card } from '@erikacarvalho/react';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { listExpenses } from '@/modules/finance/service';
import { ExpenseForm } from '@/components/finance/forms';
import { RecordEditForm } from '@/components/finance/record-edit-form';

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

    const expenses = await listExpenses(prisma, session.user.id);

    return (
        <main className="finance-page">
            <Link href="/">← Voltar ao dashboard</Link>
            <h1>Despesas</h1>
            <ExpenseForm />
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
