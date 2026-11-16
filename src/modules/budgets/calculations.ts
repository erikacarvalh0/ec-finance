export interface CategorizedExpense {
    id: string;
    categoryId: string | null;
    amountInCents: bigint;
    linkedTransactionId: string | null;
}

export interface CategorizedTransaction {
    id: string;
    categoryId: string | null;
    amountInCents: bigint;
}

export type BudgetStatus = 'NO_BUDGET' | 'ON_TRACK' | 'NEAR_LIMIT' | 'AT_LIMIT' | 'OVER_LIMIT';

export function monthBounds(period: string) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) {
        throw new Error('Invalid budget period');
    }

    const [year, month] = period.split('-').map(Number);
    const start = new Date(Date.UTC(year, month - 1, 1));

    if (start.getUTCFullYear() !== year) {
        throw new Error('Invalid budget period');
    }

    return {
        start,
        end: new Date(Date.UTC(year, month, 1)),
    };
}

export function calculateBudgetProgress(spentInCents: bigint, limitInCents: bigint) {
    if (limitInCents <= BigInt(0)) {
        throw new Error('Budget limit must be greater than zero');
    }

    const percentage = Number(spentInCents * BigInt(100) / limitInCents);
    const status: Exclude<BudgetStatus, 'NO_BUDGET'> =
        spentInCents > limitInCents ? 'OVER_LIMIT'
            : spentInCents === limitInCents ? 'AT_LIMIT'
                : spentInCents * BigInt(100) >= limitInCents * BigInt(80)
                    ? 'NEAR_LIMIT'
                    : 'ON_TRACK';

    return {
        percentage,
        status,
        remainingInCents: limitInCents - spentInCents,
    };
}

export function summarizeCategoryBudgets({
    categories,
    budgets,
    expenses,
    transactions,
}: {
    categories: Array<{ id: string; name: string }>;
    budgets: Array<{ categoryId: string; limitInCents: bigint }>;
    expenses: CategorizedExpense[];
    transactions: CategorizedTransaction[];
}) {
    const totals = new Map<string, bigint>();
    const add = (categoryId: string | null, amount: bigint) => {
        if (!categoryId) return;
        totals.set(categoryId, (totals.get(categoryId) ?? BigInt(0)) + amount);
    };

    for (const expense of expenses) {
        // A linked card transaction represents the same real purchase.
        // Count the card transaction, never both sources.
        if (!expense.linkedTransactionId) {
            add(expense.categoryId, expense.amountInCents);
        }
    }

    for (const transaction of transactions) {
        add(transaction.categoryId, transaction.amountInCents);
    }

    const limits = new Map(budgets.map((budget) => [
        budget.categoryId, budget.limitInCents,
    ]));

    return categories.map((category) => {
        const spentInCents = totals.get(category.id) ?? BigInt(0);
        const limitInCents = limits.get(category.id) ?? null;

        return {
            categoryId: category.id,
            name: category.name,
            spentInCents,
            limitInCents,
            ...(limitInCents === null ? {
                percentage: null,
                remainingInCents: null,
                status: 'NO_BUDGET' as const,
            } : calculateBudgetProgress(spentInCents, limitInCents)),
        };
    });
}
