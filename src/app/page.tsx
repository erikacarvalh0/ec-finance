import { listManagedCategories } from '@/modules/categories/management';
import dashboardStyles from '@/components/DashboardLayout/index.module.css';
import { CashflowChart } from '@/components/CashflowChart';
import { ExpensesByCategory } from '@/components/ExpensesByCategory';
import { FinancialSummary } from '@/components/FinancialSummary';
import { FinancialOverview } from '@/components/FinancialOverview';
import { DashboardHeader } from '@/components/DashboardHeader';
import { Page } from '@/components/Page';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getMonthlyFixedExpenses } from '@/modules/finance/monthly';
import { getUserCashflowForecast } from '@/modules/forecast/repository';
import { getOverdueExpenseTotals } from '@/modules/forecast/overdue';
import { getCategoryBudgetReport } from '@/modules/budgets/service';
import { getUserMonthlyCashflowReport } from '@/modules/reports/monthly';
import { summarizeDashboardRecordedCashflow } from '@/modules/reports/dashboard-cashflow';
import { OverviewDetails } from '@/components/dashboard/overview-details';

export const dynamic = 'force-dynamic';

export default async function DashboardPage({
    searchParams,
}: {
    searchParams: Promise<{ month?: string | string[] }>;
}) {
    const session = await auth();

    if (!session?.user?.id) {
        redirect('/sign-in');
    }

    const userId = session.user.id;
    const now = new Date();
    const requested = (await searchParams).month;
    const valid = typeof requested === 'string' && /^[1-9]\d{3}-(0[1-9]|1[0-2])$/.test(requested);
    const year = valid ? Number(requested.slice(0, 4)) : now.getUTCFullYear();
    const month = valid ? Number(requested.slice(5)) : now.getUTCMonth() + 1;
    const selectedMonth = new Date(Date.UTC(year, month - 1, 1));
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
                cardId: true,
            },
        }),
        getUserCashflowForecast(prisma, userId, selectedMonth, 6),
        getUserCashflowForecast(
            prisma,
            userId,
            new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 6, 1)),
            7,
        ),
        getCategoryBudgetReport(prisma, userId, `${year}-${String(month).padStart(2, '0')}`),
        getUserMonthlyCashflowReport(prisma, userId, new Date(Date.UTC(year, month - 1, 1)), 1),
    ]);
    const categoryMetadata = await listManagedCategories(prisma, userId);
    const colors = new Map(categoryMetadata.filter(category => category.type === 'EXPENSE').map(category => [category.id, category.color]));
    const recorded = summarizeDashboardRecordedCashflow(recordedMonths);
    const overdue = getOverdueExpenseTotals(
        recentMonths.flatMap((item) => item.expenses),
        now,
    );

    return (
        <Page mainClassName={dashboardStyles.main}>
            <div className={dashboardStyles.dashboard}>
                <DashboardHeader
                    name={session.user.name ?? session.user.email}
                    month={`${year}-${String(month).padStart(2, '0')}`}
                />
                <FinancialSummary
                    income={Number(recorded.incomeInCents)}
                    expenses={Number(recorded.expenseInCents)}
                    balance={Number(recorded.netInCents)}
                />
                <section className={dashboardStyles.charts} aria-label="Gráficos financeiros">
                <CashflowChart
                    income={Number(recorded.incomeInCents)}
                    expenses={Number(recorded.expenseInCents)}
                />
                <ExpensesByCategory
                    categories={budgetReport.categories.map(category => ({
                        name: category.name,
                        color: colors.get(category.categoryId),
                        cents: Number(category.spentInCents),
                    }))}
                />
                </section>
                <FinancialOverview
                    fixed={Number(fixed.totalInCents)}
                    overdue={Number(overdue.totalInCents)}
                    count={overdue.count}
                    transactions={transactions.length}
                />
                <OverviewDetails
                    forecast={forecast}
                    categories={budgetReport.categories.map(category => ({
                        ...category,
                        color: categoryMetadata.find(metadata => metadata.id === category.categoryId)?.color ?? '#137E76',
                        iconBackground: categoryMetadata.find(metadata => metadata.id === category.categoryId)?.iconBackground ?? '#E6F3F0',
                        icon: categoryMetadata.find(metadata => metadata.id === category.categoryId)?.icon ?? 'wallet',
                    }))}
                    fixedExpenses={fixed.expenses}
                    fixedCardTransactions={fixed.cardTransactions}
                    cardTransactions={transactions.filter(transaction => transaction.cardId !== null)}
                    selectedPeriod={`${year}-${String(month).padStart(2, '0')}`}
                />
            </div>
        </Page>
    );
}
