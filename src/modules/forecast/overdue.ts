import type { OccurrenceStatus } from './reconcile';

export interface OverdueCandidate {
    status: OccurrenceStatus;
    dueDate: Date;
    effectiveAmountInCents: bigint;
}

export function isOccurrenceOverdue(
    status: OccurrenceStatus,
    dueDate: Date,
    today: Date,
): boolean {
    if (status !== 'PENDING') {
        return false;
    }

    const dueDay = Date.UTC(
        dueDate.getUTCFullYear(),
        dueDate.getUTCMonth(),
        dueDate.getUTCDate(),
    );
    const currentDay = Date.UTC(
        today.getUTCFullYear(),
        today.getUTCMonth(),
        today.getUTCDate(),
    );

    return dueDay < currentDay;
}

export function getOverdueExpenseTotals(
    expenses: OverdueCandidate[],
    today: Date,
) {
    const overdue = expenses.filter((expense) => (
        isOccurrenceOverdue(expense.status, expense.dueDate, today)
    ));

    return {
        count: overdue.length,
        totalInCents: overdue.reduce(
            (total, expense) => total + expense.effectiveAmountInCents,
            BigInt(0),
        ),
    };
}
