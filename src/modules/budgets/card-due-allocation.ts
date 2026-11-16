import { getInvoiceDueDate, getInvoicePeriod } from '@/modules/cards/invoice';
import { allocateInstallmentToMonth } from './installment-allocation';

type CardCycle = { closingDay: number | null; dueDay: number | null };
type CardInstallment = { amountInCents: bigint; installments: number; date: Date };

/**
 * Projects manual card purchases into the calendar month when each invoice
 * is due, rather than the purchase month. This does not create a second
 * expense for an imported or linked transaction.
 */
export function allocateCardInstallmentToDueMonth(
    expense: CardInstallment,
    card: CardCycle,
    period: string,
): bigint {
    if (card.closingDay === null || card.dueDay === null) {
        throw new Error('Card billing cycle is not configured');
    }
    const firstInvoice = getInvoicePeriod(expense.date, card.closingDay);
    const [year, month] = firstInvoice.split('-').map(Number);
    let total = BigInt(0);
    for (let index = 0; index < expense.installments; index += 1) {
        const invoiceDate = new Date(Date.UTC(year, month - 1 + index, 1));
        const invoicePeriod = `${invoiceDate.getUTCFullYear()}-${String(invoiceDate.getUTCMonth() + 1).padStart(2, '0')}`;
        const dueDate = getInvoiceDueDate(invoicePeriod, card.closingDay, card.dueDay);
        const duePeriod = `${dueDate.getUTCFullYear()}-${String(dueDate.getUTCMonth() + 1).padStart(2, '0')}`;
        if (duePeriod === period) {
            total += allocateInstallmentToMonth({
                ...expense,
                date: new Date(Date.UTC(year, month - 1, 1)),
            }, invoicePeriod);
        }
    }
    return total;
}
