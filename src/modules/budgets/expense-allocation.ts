import { allocateCardInstallmentToDueMonth } from './card-due-allocation';
import { allocateInstallmentToMonth, allocateRecurringExpenseToMonth } from './installment-allocation';

export type BudgetExpenseInput = {
    amountInCents: bigint;
    installments: number;
    date: Date;
    type: 'FIXED' | 'VARIABLE';
    paymentMethod: 'PIX' | 'CREDIT' | 'DEBIT' | 'AUTOMATIC_DEBIT' | 'OTHER';
    endsOn?: Date | null;
    card?: { closingDay: number | null; dueDay: number | null } | null;
};

export function calculateBudgetExpenseAmount(expense: BudgetExpenseInput, period: string): bigint {
    if (expense.type === 'FIXED') {
        return allocateRecurringExpenseToMonth({
            amountInCents: expense.amountInCents,
            date: expense.date,
            endsOn: expense.endsOn ?? null,
        }, period);
    }
    if (expense.paymentMethod === 'CREDIT'
        && expense.card?.closingDay != null
        && expense.card.dueDay != null) {
        return allocateCardInstallmentToDueMonth(expense, expense.card, period);
    }
    return allocateInstallmentToMonth(expense, period);
}
