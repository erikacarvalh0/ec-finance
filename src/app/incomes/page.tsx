import { listCategories } from '@/modules/categories/service';
import { Page } from '@/components/Page';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getPagedIncomeHistory } from '@/modules/income/paged-history';
import { IncomeHistory } from '@/components/IncomeHistory';
import { IncomeSummary } from '@/components/IncomeSummary';
import { getIncomeSummary } from '@/modules/income/summary';
import { IncomeHeader } from '@/components/IncomeHeader';
import styles from './page.module.css';
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
    searchParams: Promise<{ type?: string; search?: string; page?: string; month?: string; categoryId?: string; view?: string }>;
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
    const filters = { type: validType, search, archived, month: /^\d{4}-(0[1-9]|1[0-2])$/.test(params.month ?? '') ? params.month : undefined, categoryId: params.categoryId?.slice(0, 200), page: params.page };
    const { incomes, page, pages } = await getPagedIncomeHistory(prisma, session.user.id, filters);

    const [categories, summary] = await Promise.all([
        listCategories(prisma, session.user.id, 'INCOME'),
        getIncomeSummary(prisma, session.user.id),
    ]);

    return (
        <Page>
            <div className={`finance-page ${styles['incomes-page']}`}>
            <IncomeHeader categories={categories.map(({ id, name }) => ({ id, name }))} />
            <IncomeSummary summary={summary} />
            <IncomeHistory filters={filters} categories={categories} page={page} pages={pages} rows={incomes.map(income => ({
                id: income.id,
                date: (income.date ?? income.createdAt).toLocaleDateString('pt-BR', { timeZone: 'UTC' }),
                description: income.description ?? income.responsible ?? (income.type === 'SALARY' ? 'Salário' : 'Outra entrada'),
                type: income.type === 'RECURRING' ? 'Recorrente' : income.type === 'SALARY' ? 'Salário' : 'Eventual',
                category: categories.find(category => category.id === income.categoryId)?.name ?? 'Sem categoria',
                amount: currency.format(Number(income.amountInCents) / 100),
                actions: <div>
                    {!archived && income.type === 'RECURRING' && (
                                <EndRecurrenceForm
                                    kind="income"
                                    id={income.id}
                                    currentDate={income.endsOn?.toISOString().slice(0, 10) ?? ''}
                                />
                            )}
                            {!archived && <RecordEditForm categories={categories} record={{
                                kind: 'income',
                                categoryId: income.categoryId ?? '',
                                id: income.id,
                                amountInCents: income.amountInCents.toString(),
                                type: income.type,
                                responsible: income.responsible ?? '',
                                description: income.description ?? '',
                                date: income.date?.toISOString().slice(0, 10) ?? '',
                                endsOn: income.endsOn?.toISOString().slice(0, 10) ?? '',
                            }} />}
                            <IncomeArchiveButton id={income.id} archived={archived} />
                </div>,
            }))} />
            </div>
        </Page>
    );
}
