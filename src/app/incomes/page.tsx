import Link from 'next/link';
import { Page } from '@/components/page';
import { redirect } from 'next/navigation';
import { Card } from '@/components/ecds-v1/compat';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { listFilteredIncomes } from '@/modules/income/history';
import { IncomeForm } from '@/components/finance/forms';
import { RecordEditForm } from '@/components/finance/record-edit-form';
import { EndRecurrenceForm } from '@/components/finance/end-recurrence-form';
import { IncomeArchiveButton } from '@/components/finance/income-archive-button';
import { parseIncomeArchiveView } from '@/modules/income/archive-view';

export const dynamic = 'force-dynamic';

const currency = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
});

export default async function IncomesPage({
    searchParams,
}: {
    searchParams: Promise<{ type?: string; search?: string; cursor?: string; view?: string }>;
}) {
    const session = await auth();

    if (!session?.user?.id) {
        redirect('/sign-in');
    }

    const params = await searchParams;
    const validType = ['SALARY', 'RECURRING', 'OTHER'].includes(params.type ?? '')
        ? params.type as 'SALARY' | 'RECURRING' | 'OTHER'
        : undefined;
    const search = (params.search ?? '').slice(0, 100).trim();
    const archived = parseIncomeArchiveView(params.view);
    const { incomes, nextCursor } = await listFilteredIncomes(prisma, session.user.id, {
        type: validType,
        search,
        cursor: params.cursor,
        archived,
    });

    const nextQuery = new URLSearchParams();
    if (validType) nextQuery.set('type', validType);
    if (search) nextQuery.set('search', search);
    if (nextCursor) nextQuery.set('cursor', nextCursor);
    if (archived) nextQuery.set('view', 'archived');

    return (
        <Page>
            <div className="finance-page">
            <h1>Entradas</h1>
            <IncomeForm />
            <Card padding="lg">
                <h2>Histórico de entradas</h2>
                <p><Link href={archived ? '/incomes' : '/incomes?view=archived'}>{archived ? 'Ver entradas ativas' : 'Ver entradas arquivadas'}</Link></p>
                <form action="/incomes" className="finance-form">
                    {archived && <input type="hidden" name="view" value="archived" />}
                    <label>
                        Pesquisar por responsável ou descrição
                        <input
                            name="search"
                            type="search"
                            maxLength={100}
                            defaultValue={search}
                            placeholder="Ex.: aluguel"
                        />
                    </label>
                    <label>
                        Tipo de entrada
                        <select name="type" defaultValue={validType ?? ''}>
                            <option value="">Todos os tipos</option>
                            <option value="SALARY">Salário</option>
                            <option value="RECURRING">Recorrente</option>
                            <option value="OTHER">Outros</option>
                        </select>
                    </label>
                    <button type="submit">Aplicar filtros</button>
                </form>
                {incomes.length === 0 && <p>Nenhuma entrada registrada.</p>}
                <ul className="record-list">
                    {incomes.map((income) => (
                        <li key={income.id}>
                            <strong>{income.description ?? (
                                income.type === 'SALARY' ? 'Salário' : 'Outra entrada'
                            )}</strong>
                            <span>{currency.format(Number(income.amountInCents) / 100)}</span>
                            <small>{income.type === 'RECURRING' ? 'Recorrente' : income.type}</small>
                            {!archived && income.type === 'RECURRING' && (
                                <EndRecurrenceForm
                                    kind="income"
                                    id={income.id}
                                    currentDate={income.endsOn?.toISOString().slice(0, 10) ?? ''}
                                />
                            )}
                            {!archived && <RecordEditForm record={{
                                kind: 'income',
                                id: income.id,
                                amountInCents: income.amountInCents.toString(),
                                type: income.type,
                                responsible: income.responsible ?? '',
                                description: income.description ?? '',
                                date: income.date?.toISOString().slice(0, 10) ?? '',
                                endsOn: income.endsOn?.toISOString().slice(0, 10) ?? '',
                            }} />}
                            <IncomeArchiveButton id={income.id} archived={archived} />
                        </li>
                    ))}
                </ul>
                {nextCursor && (
                    <Link href={`/incomes?${nextQuery.toString()}`}>
                        Carregar próximas 20 entradas
                    </Link>
                )}
            </Card>
            </div>
        </Page>
    );
}
