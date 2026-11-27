import { Page } from '@/components/Page';
import { redirect } from 'next/navigation';
import { Card } from '@/components/ecds-v1/compat';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { listExpenseTableRecords, mapExpenseTableRows } from '@/modules/expenses/table-history';
import { ExpenseTable } from '@/components/ExpenseTable';
import { ExpenseRowActions } from '@/components/ExpenseRowActions';
import { listUserCards } from '@/modules/cards/service';
import { listCategories } from '@/modules/categories/service';
import { LinkImportedTransactionForm } from '@/components/cards/card-forms';
import { BulkCategoryForm } from '@/components/finance/bulk-category-form';
import { ExpenseHistoryHeader } from '@/components/ExpenseHistoryHeader';
import { ExpenseFilters } from '@/components/ExpenseFilters';
import { ExpenseForm } from '@/components/finance/forms';
import { EndRecurrenceForm } from '@/components/finance/end-recurrence-form';
import { resolveExpenseHistoryView } from '@/modules/expenses/history-visibility';
import { parseExpenseArchiveView } from '@/modules/expenses/archive-view';

import styles from './page.module.css';

export const dynamic = 'force-dynamic';


export default async function ExpensesPage({
    searchParams,
}: {
    searchParams: Promise<{ type?: string; paymentMethod?: string; search?: string; cursor?: string; view?: string; month?: string; categoryId?: string; status?: string }>;
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
    const month = typeof query.month === 'string' && /^[1-9]\d{3}-(0[1-9]|1[0-2])$/.test(query.month) ? query.month : undefined;
    const categoryId = typeof query.categoryId === 'string' ? query.categoryId.trim().slice(0, 200) || undefined : undefined;
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    const [activeCount, archivedCount, monthlyExpenseCount] = await Promise.all([
        prisma.expense.count({ where: { userId: session.user.id, archivedAt: null } }),
        prisma.expense.count({ where: { userId: session.user.id, archivedAt: { not: null } } }),
        prisma.expense.count({ where: { userId: session.user.id, archivedAt: null, OR: [{ date: { gte: monthStart, lt: monthEnd } }, { date: null, createdAt: { gte: monthStart, lt: monthEnd } }] } }),
    ]);
    const { visible, archived } = resolveExpenseHistoryView(
        activeCount,
        archivedCount,
        parseExpenseArchiveView(query.view),
    );
    const [history, cards, transactions, categories] = await Promise.all([
        listExpenseTableRecords(prisma, session.user.id, {
            type,
            paymentMethod,
            search,
            month,
            categoryId,
            status,
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

    const expenses = history;
    const selectedMonth = month ?? now.toISOString().slice(0, 7);
    const rows = expenses.flatMap(expense => mapExpenseTableRows(expense, selectedMonth, status, categories.find(category => category.id === expense.categoryId)?.name ?? 'Sem categoria').map(row => ({
        ...row,
        actions: <ExpenseRowActions
            key={row.id}
            row={row}
            archived={archived}
            expense={{
                id: expense.id, description: expense.description, amountInCents: expense.amountInCents.toString(),
                type: expense.type, paymentMethod: expense.paymentMethod, date: expense.date?.toISOString().slice(0, 10) ?? '',
                firstDueDate: (expense.date ?? expense.createdAt).toISOString().slice(0, 10),
                installments: expense.installments, endsOn: expense.endsOn?.toISOString().slice(0, 10) ?? '',
                categoryId: expense.categoryId ?? '',
            }}
            categories={categories.map(({ id, name }) => ({ id, name }))}
            occurrences={expense.occurrences.map(item => ({ month: item.dueMonth.toISOString().slice(0, 7), status: item.status, actualAmountInCents: item.actualAmountInCents?.toString() ?? null }))}
            additionalActions={<>
                {!archived && expense.type === 'FIXED' && expense.installments === 1 && <EndRecurrenceForm kind="expense" id={expense.id} currentDate={expense.endsOn?.toISOString().slice(0, 10) ?? ''} />}
                {!archived && expense.paymentMethod === 'CREDIT' && expense.cardId && !expense.linkedTransactionId && <LinkImportedTransactionForm expenseId={expense.id} transactions={transactions.filter(transaction => transaction.cardId === expense.cardId).map(transaction => ({ id: transaction.id, description: transaction.description, amountInCents: transaction.amountInCents.toString() }))} />}
                {expense.linkedTransactionId && <small>Vinculada à compra importada</small>}
            </>}
        />,
    })));

    return (
        <Page>
            <div className={`finance-page ${styles['expenses-page']}`}>
            <header className={styles['expenses-page__header']}>
                <h1>Despesas</h1>
                <p>Gerencie e acompanhe suas despesas.</p>
            </header>
            <ExpenseForm cards={cards} categories={categories} monthlyExpenseCount={monthlyExpenseCount} />
            {visible && (
                <Card padding="lg">
                    <ExpenseHistoryHeader
                        archived={archived}
                        hasArchived={archivedCount > 0}
                        hasActive={activeCount > 0}
                    />
                    <ExpenseFilters archived={archived} search={search} type={type} paymentMethod={paymentMethod} month={selectedMonth} categoryId={categoryId} categories={categories} status={status} />
                    
                    {!archived && expenses.length > 0 && <BulkCategoryForm rows={expenses.map(({ id, description, categoryId }) => ({ id, description, categoryId }))} categories={categories.map(({ id, name }) => ({ id, name }))} />}
                    <ExpenseTable rows={rows} />
                </Card>
            )}
            </div>
        </Page>
    );
}
