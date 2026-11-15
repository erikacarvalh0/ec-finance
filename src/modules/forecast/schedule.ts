export interface ForecastExpense {
    id: string;
    description: string;
    amountInCents: bigint;
    date: Date | null;
    createdAt: Date;
    installments: number;
    type: 'FIXED' | 'VARIABLE';
    paymentMethod: string;
}

export interface ForecastIncome {
    id: string;
    description: string | null;
    amountInCents: bigint;
    date: Date | null;
    createdAt: Date;
    type: 'SALARY' | 'RECURRING' | 'OTHER';
}

export interface ScheduledExpense {
    sourceId: string;
    description: string;
    amountInCents: bigint;
    dueDate: Date;
    installmentNumber: number;
    installmentCount: number;
}

export interface ForecastMonth {
    year: number;
    month: number;
    expenseTotalInCents: bigint;
    incomeTotalInCents: bigint;
    balanceInCents: bigint;
    expenses: ScheduledExpense[];
    incomes: Array<{
        sourceId: string;
        description: string;
        amountInCents: bigint;
        dueDate: Date;
    }>;
}

function monthIndex(date: Date): number {
    return date.getUTCFullYear() * 12 + date.getUTCMonth();
}

function sameMonth(left: Date, right: Date): boolean {
    return monthIndex(left) === monthIndex(right);
}

export function addMonthsClamped(date: Date, offset: number): Date {
    if (!Number.isInteger(offset) || Number.isNaN(date.getTime())) {
        throw new Error('Invalid calendar date');
    }

    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    const day = date.getUTCDate();
    const endOfTarget = new Date(Date.UTC(year, month + offset + 1, 0)).getUTCDate();

    return new Date(Date.UTC(
        year,
        month + offset,
        Math.min(day, endOfTarget),
    ));
}

export function buildInstallments(
    expenseId: string,
    description: string,
    amountInCents: bigint,
    firstDueDate: Date,
    count: number,
): ScheduledExpense[] {
    if (!Number.isInteger(count) || count < 1 || count > 120) {
        throw new Error('Installment count must be between 1 and 120');
    }

    if (amountInCents <= BigInt(0) || Number.isNaN(firstDueDate.getTime())) {
        throw new Error('Invalid installment amount or date');
    }

    const installments = BigInt(count);
    const baseAmount = amountInCents / installments;
    const remainder = amountInCents % installments;

    return Array.from({ length: count }, (_, index) => ({
        sourceId: expenseId,
        description,
        amountInCents: baseAmount + (BigInt(index) < remainder ? BigInt(1) : BigInt(0)),
        dueDate: addMonthsClamped(firstDueDate, index),
        installmentNumber: index + 1,
        installmentCount: count,
    }));
}

export function buildMonthlyForecast({
    start,
    monthCount,
    expenses,
    incomes,
}: {
    start: Date;
    monthCount: number;
    expenses: ForecastExpense[];
    incomes: ForecastIncome[];
}): ForecastMonth[] {
    if (!Number.isInteger(monthCount) || monthCount < 1 || monthCount > 24
        || Number.isNaN(start.getTime())) {
        throw new Error('Invalid forecast window');
    }

    const firstMonth = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));

    return Array.from({ length: monthCount }, (_, index) => {
        const current = addMonthsClamped(firstMonth, index);
        const scheduledExpenses: ScheduledExpense[] = [];
        const scheduledIncomes: ForecastMonth['incomes'] = [];

        for (const expense of expenses) {
            const firstDueDate = expense.date ?? expense.createdAt;

            if (expense.installments > 1) {
                const monthsSinceStart = monthIndex(current) - monthIndex(firstDueDate);

                if (monthsSinceStart >= 0 && monthsSinceStart < expense.installments) {
                    const installmentCount = BigInt(expense.installments);
                    const base = expense.amountInCents / installmentCount;
                    const remainder = expense.amountInCents % installmentCount;

                    scheduledExpenses.push({
                        sourceId: expense.id,
                        description: expense.description,
                        amountInCents: base + (BigInt(monthsSinceStart) < remainder
                            ? BigInt(1)
                            : BigInt(0)),
                        dueDate: addMonthsClamped(firstDueDate, monthsSinceStart),
                        installmentNumber: monthsSinceStart + 1,
                        installmentCount: expense.installments,
                    });
                }

                continue;
            }

            const isRecurring = expense.type === 'FIXED';
            const isActive = monthIndex(current) >= monthIndex(firstDueDate);

            if ((isRecurring && isActive) || sameMonth(current, firstDueDate)) {
                scheduledExpenses.push({
                    sourceId: expense.id,
                    description: expense.description,
                    amountInCents: expense.amountInCents,
                    dueDate: isRecurring
                        ? addMonthsClamped(firstDueDate, monthIndex(current) - monthIndex(firstDueDate))
                        : firstDueDate,
                    installmentNumber: 1,
                    installmentCount: 1,
                });
            }
        }

        for (const income of incomes) {
            const firstDueDate = income.date ?? income.createdAt;
            const monthsSinceStart = monthIndex(current) - monthIndex(firstDueDate);
            const isDue = income.type === 'RECURRING'
                ? monthsSinceStart >= 0
                : monthsSinceStart === 0;

            if (isDue) {
                scheduledIncomes.push({
                    sourceId: income.id,
                    description: income.description
                        ?? (income.type === 'SALARY' ? 'Salário' : 'Entrada'),
                    amountInCents: income.amountInCents,
                    dueDate: income.type === 'RECURRING'
                        ? addMonthsClamped(firstDueDate, monthsSinceStart)
                        : firstDueDate,
                });
            }
        }

        const expenseTotalInCents = scheduledExpenses.reduce(
            (total, expense) => total + expense.amountInCents,
            BigInt(0),
        );
        const incomeTotalInCents = scheduledIncomes.reduce(
            (total, income) => total + income.amountInCents,
            BigInt(0),
        );

        return {
            year: current.getUTCFullYear(),
            month: current.getUTCMonth() + 1,
            expenseTotalInCents,
            incomeTotalInCents,
            balanceInCents: incomeTotalInCents - expenseTotalInCents,
            expenses: scheduledExpenses,
            incomes: scheduledIncomes,
        };
    });
}
