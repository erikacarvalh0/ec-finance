import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Card } from '@erikacarvalho/react';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { listIncomes } from '@/modules/finance/service';
import { IncomeForm } from '@/components/finance/forms';
import { RecordEditForm } from '@/components/finance/record-edit-form';
import { EndRecurrenceForm } from '@/components/finance/end-recurrence-form';

export const dynamic = 'force-dynamic';

const currency = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
});

export default async function IncomesPage() {
    const session = await auth();

    if (!session?.user?.id) {
        redirect('/sign-in');
    }

    const incomes = await listIncomes(prisma, session.user.id);

    return (
        <main className="finance-page">
            <Link href="/">← Voltar ao dashboard</Link>
            <h1>Entradas</h1>
            <IncomeForm />
            <Card padding="lg">
                <h2>Histórico de entradas</h2>
                {incomes.length === 0 && <p>Nenhuma entrada registrada.</p>}
                <ul className="record-list">
                    {incomes.map((income) => (
                        <li key={income.id}>
                            <strong>{income.description ?? (
                                income.type === 'SALARY' ? 'Salário' : 'Outra entrada'
                            )}</strong>
                            <span>{currency.format(Number(income.amountInCents) / 100)}</span>
                            <small>{income.type === 'RECURRING' ? 'Recorrente' : income.type}</small>
                            {income.type === 'RECURRING' && (
                                <EndRecurrenceForm
                                    kind="income"
                                    id={income.id}
                                    currentDate={income.endsOn?.toISOString().slice(0, 10) ?? ''}
                                />
                            )}
                            <RecordEditForm record={{
                                kind: 'income',
                                id: income.id,
                                amountInCents: income.amountInCents.toString(),
                                type: income.type,
                                responsible: income.responsible ?? '',
                                description: income.description ?? '',
                                date: income.date?.toISOString().slice(0, 10) ?? '',
                                endsOn: income.endsOn?.toISOString().slice(0, 10) ?? '',
                            }} />
                        </li>
                    ))}
                </ul>
            </Card>
        </main>
    );
}
