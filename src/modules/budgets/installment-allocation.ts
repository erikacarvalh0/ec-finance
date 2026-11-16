import { monthBounds } from './calculations';

type InstallmentExpense = {
    amountInCents: bigint;
    installments: number;
    date: Date;
};

/**
 * Allocates a purchase's total to consecutive UTC calendar months.
 * Remainder cents are assigned to the earliest installments so the sum
 * exactly matches the original amount. Does not represent invoice due dates.
 */
export function allocateInstallmentToMonth(
    expense: InstallmentExpense,
    period: string,
): bigint {
    const { start } = monthBounds(period);
    if (expense.amountInCents < BigInt(0)
        || !Number.isInteger(expense.installments)
        || expense.installments < 1
        || expense.installments > 360
        || !Number.isFinite(expense.date.getTime())) {
        throw new Error('Invalid installment expense');
    }
    const offset = (start.getUTCFullYear() - expense.date.getUTCFullYear()) * 12
        + start.getUTCMonth() - expense.date.getUTCMonth();
    if (offset < 0 || offset >= expense.installments) {
        return BigInt(0);
    }
    const count = BigInt(expense.installments);
    const base = expense.amountInCents / count;
    const remainder = expense.amountInCents % count;
    return base + (BigInt(offset) < remainder ? BigInt(1) : BigInt(0));
}
