import { Page } from '@/components/Page';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Card } from '@/components/ecds-v1/compat';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { listFilteredExpenses } from '@/modules/expenses/history';
import { listUserCards } from '@/modules/cards/service';
import { listCategories } from '@/modules/categories/service';
import { LinkImportedTransactionForm } from '@/components/cards/card-forms';
import { BulkCategoryForm } from '@/components/finance/bulk-category-form';
import { ExpenseHistoryHeader } from '@/components/ExpenseHistoryHeader';
import { ExpenseFilters } from '@/components/ExpenseFilters';
import { ExpenseForm } from '@/components/finance/forms';
import { RecordEditForm } from '@/components/finance/record-edit-form';
import { EndRecurrenceForm } from '@/components/finance/end-recurrence-form';
import { ExpenseArchiveButton } from '@/components/finance/expense-archive-button';
import { resolveExpenseHistoryView } from '@/modules/expenses/history-visibility';
import { parseExpenseArchiveView } from '@/modules/expenses/archive-view';

export const dynamic = 'force-dynamic';

const currency = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
});

export default async function ExpensesPage({
    searchParams,
}: {
    searchParams: Promise<{ type?: string; paymentMethod?: string; search?: string; cursor?: string; view?: string; status?: string }>;
}) {
    const session = await auth();

    if (!session?.user?.id) {
        redirect('/sign-in');
    }

    const query = await searchParams;
    const type = ['FIXED', 'VARIABLE'].includes(query.type ?? '')
        ? query.type as 'FIXED' | 'VARIABLE'
        : undefined;
    const paymentMethod = ['PIX', 'CREDIT', 'DEBIT', 'AUTOMATIC_DEBIT', 'OTHER']
        .includes(query.paymentMethod ?? '')
        ? query.paymentMethod as 'PIX' | 'CREDIT' | 'DEBIT' | 'AUTOMATIC_DEBIT' | 'OTHER'
        : undefined;
    const search = (query.search ?? '').trim().slice(0, 100);
    const status = ['PENDING', 'SETTLED', 'CANCELED'].includes(query.status ?? '')
        ? query.status as 'PENDING' | 'SETTLED' | 'CANCELED'
        : undefined;
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    const [activeCount, archivedCount, monthlyExpenseCount] = await Promise.all([
        prisma.expense.count({ where: { userId: session.user.id, archivedAt: null } }),
        prisma.expense.count({ where: { userId: session.user.id, archivedAt: { not: null } } }),
        prisma.expense.count({
            where: {
                userId: session.user.id,
                archivedAt: null,
                OR: [
                    { date: { gte: monthStart, lt: monthEnd } },
                    { date: null, createdAt: { gte: monthStart, lt: monthEnd } },
                ],
            },
        }),
    ]);
    const { visible, archived } = resolveExpenseHistoryView(
        activeCount,
        archivedCount,
        parseExpenseArchiveView(query.view),
    );
    const [history, cards, transactions, categories] = await Promise.all([
        listFilteredExpenses(prisma, session.user.id, {
            type,
            paymentMethod,
            search,
            status,
            cursor: query.cursor,
            archived,
        }),
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
        listCategories(prisma, session.user.id),
    ]);

    const { expenses, nextCursor } = history;
    const nextQuery = new URLSearchParams();
    if (type) nextQuery.set('type', type);
    if (paymentMethod) nextQuery.set('paymentMethod', paymentMethod);
    if (status) nextQuery.set('status', status);
    if (search) nextQuery.set('search', search);
    if (nextCursor) nextQuery.set('cursor', nextCursor);
    if (archived) nextQuery.set('view', 'archived');

    return (
        <Page>
            <div className="finance-page">
            <h1>Despesas</h1>
            <ExpenseForm cards={cards} categories={categories} monthlyExpenseCount={monthlyExpenseCount} />
            {visible && (
                <Card padding="lg">
                    <ExpenseHistoryHeader
                        archived={archived}
                        hasArchived={archivedCount > 0}
                        hasActive={activeCount > 0}
                    />
                    <ExpenseFilters archived={archived} search={search} type={type} paymentMethod={paymentMethod} status={status} />
                    {expenses.length === 0 && <p>Nenhuma despesa registrada.</p>}
                    {!archived && expenses.length > 0 && <BulkCategoryForm rows={expenses.map(({ id, description, categoryId }) => ({ id, description, categoryId }))} categories={categories.map(({ id, name }) => ({ id, name }))} />}
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
                                {!archived && expense.type === 'FIXED' && expense.installments === 1 && (
                                    <EndRecurrenceForm
                                        kind="expense"
                                        id={expense.id}
                                        currentDate={expense.endsOn?.toISOString().slice(0, 10) ?? ''}
                                    />
                                )}
                                {!archived && expense.paymentMethod === 'CREDIT'
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
                                {!archived && <RecordEditForm categories={categories} record={{
                                    kind: 'expense',
                                    id: expense.id,
                                    description: expense.description,
                                    amountInCents: expense.amountInCents.toString(),
                                    type: expense.type,
                                    paymentMethod: expense.paymentMethod,
                                    date: expense.date?.toISOString().slice(0, 10) ?? '',
                                    installments: expense.installments,
                                    endsOn: expense.endsOn?.toISOString().slice(0, 10) ?? '',
                                    categoryId: expense.categoryId ?? '',
                                }} />}
                                <ExpenseArchiveButton id={expense.id} archived={archived} />
                            </li>
                        ))}
                    </ul>
                    {nextCursor && (
                        <Link href={`/expenses?${nextQuery.toString()}`}>
                            Carregar próximas 20 despesas
                        </Link>
                    )}
                </Card>
            )}
            </div>
        </Page>
    );
}
