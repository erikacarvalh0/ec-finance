import { buildInstallments } from '@/modules/forecast/schedule';

export type InstallmentOccurrence = {
    month: string;
    status: 'PENDING' | 'SETTLED' | 'CANCELED';
    actualAmountInCents: string | null;
};

export function getExpenseInstallments(expense: {
    id: string;
    description: string;
    amountInCents: string;
    firstDueDate: string;
    installments: number;
}, occurrences: InstallmentOccurrence[]) {
    const byMonth = new Map(occurrences.map(item => [item.month, item]));

    return buildInstallments(expense.id, expense.description, BigInt(expense.amountInCents), new Date(expense.firstDueDate), expense.installments)
        .map(item => {
            const date = item.dueDate.toISOString().slice(0, 10);
            const occurrence = byMonth.get(date.slice(0, 7));

            return {
                number: item.installmentNumber,
                date,
                amountInCents: item.amountInCents,
                status: occurrence?.status ?? 'PENDING',
                actualAmountInCents: occurrence?.actualAmountInCents == null ? item.amountInCents : BigInt(occurrence.actualAmountInCents),
            };
        });
}
