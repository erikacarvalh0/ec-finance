import type { ForecastMonth } from './schedule';

export type OccurrenceStatus = 'PENDING' | 'SETTLED' | 'CANCELED';

export type ExpenseAdjustment = {
    expenseId: string;
    dueMonth: Date;
    status: OccurrenceStatus;
    actualAmountInCents: bigint | null;
};

export type IncomeAdjustment = {
    incomeId: string;
    dueMonth: Date;
    status: OccurrenceStatus;
    actualAmountInCents: bigint | null;
};

type ReconciledItem<T> = T & {
    status: OccurrenceStatus;
    effectiveAmountInCents: bigint;
};

export type ReconciledMonth = Omit<
    ForecastMonth,
    'expenses' | 'incomes'
> & {
    expenses: Array<ReconciledItem<ForecastMonth['expenses'][number]>>;
    incomes: Array<ReconciledItem<ForecastMonth['incomes'][number]>>;
    pendingExpenseInCents: bigint;
    settledExpenseInCents: bigint;
    pendingIncomeInCents: bigint;
    settledIncomeInCents: bigint;
};

function monthKey(date: Date): string {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function actualAmount(
    plannedAmount: bigint,
    status: OccurrenceStatus,
    recordedAmount: bigint | null | undefined,
): bigint {
    if (status === 'CANCELED') {
        return BigInt(0);
    }

    return recordedAmount ?? plannedAmount;
}

export function reconcileForecast(
    months: ForecastMonth[],
    expenseAdjustments: ExpenseAdjustment[],
    incomeAdjustments: IncomeAdjustment[],
): ReconciledMonth[] {
    const expenseIndex = new Map(expenseAdjustments.map((adjustment) => [
        `${adjustment.expenseId}:${monthKey(adjustment.dueMonth)}`,
        adjustment,
    ]));
    const incomeIndex = new Map(incomeAdjustments.map((adjustment) => [
        `${adjustment.incomeId}:${monthKey(adjustment.dueMonth)}`,
        adjustment,
    ]));

    return months.map((month) => {
        const key = `${month.year}-${String(month.month).padStart(2, '0')}`;
        const expenses = month.expenses.map((item) => {
            const adjustment = expenseIndex.get(`${item.sourceId}:${key}`);
            const status = adjustment?.status ?? 'PENDING';

            return {
                ...item,
                status,
                effectiveAmountInCents: actualAmount(
                    item.amountInCents,
                    status,
                    adjustment?.actualAmountInCents,
                ),
            };
        });
        const incomes = month.incomes.map((item) => {
            const adjustment = incomeIndex.get(`${item.sourceId}:${key}`);
            const status = adjustment?.status ?? 'PENDING';

            return {
                ...item,
                status,
                effectiveAmountInCents: actualAmount(
                    item.amountInCents,
                    status,
                    adjustment?.actualAmountInCents,
                ),
            };
        });
        const total = (items: Array<{
            status: OccurrenceStatus;
            effectiveAmountInCents: bigint;
        }>, status: OccurrenceStatus) => items.reduce(
            (sum, item) => sum + (
                item.status === status ? item.effectiveAmountInCents : BigInt(0)
            ),
            BigInt(0),
        );

        const pendingExpenseInCents = total(expenses, 'PENDING');
        const settledExpenseInCents = total(expenses, 'SETTLED');
        const pendingIncomeInCents = total(incomes, 'PENDING');
        const settledIncomeInCents = total(incomes, 'SETTLED');
        const expenseTotalInCents = pendingExpenseInCents + settledExpenseInCents;
        const incomeTotalInCents = pendingIncomeInCents + settledIncomeInCents;

        return {
            ...month,
            expenses,
            incomes,
            expenseTotalInCents,
            incomeTotalInCents,
            balanceInCents: incomeTotalInCents - expenseTotalInCents,
            pendingExpenseInCents,
            settledExpenseInCents,
            pendingIncomeInCents,
            settledIncomeInCents,
        };
    });
}
