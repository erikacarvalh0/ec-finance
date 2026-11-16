import { addMonthsClamped } from '@/modules/forecast/schedule';

export interface InvoiceCard {
    id: string;
    closingDay: number | null;
    dueDay: number | null;
}

export interface CardPurchase {
    id: string;
    description: string;
    amountInCents: bigint;
    occurredAt: Date;
}

export interface ManualCardExpense {
    id: string;
    description: string;
    amountInCents: bigint;
    installments: number;
    date: Date | null;
    createdAt: Date;
    linkedTransactionId: string | null;
}

interface InvoiceLine {
    id: string;
    description: string;
    amountInCents: bigint;
    installmentLabel: string | null;
    source: 'IMPORTED' | 'MANUAL';
}

function monthStart(date: Date): Date {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function monthKey(date: Date): string {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function lastDay(year: number, monthIndex: number): number {
    return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

function monthOffset(from: Date, to: Date): number {
    return (to.getUTCFullYear() - from.getUTCFullYear()) * 12
        + to.getUTCMonth() - from.getUTCMonth();
}

function validDay(day: number | null): day is number {
    return Number.isInteger(day) && day !== null && day >= 1 && day <= 31;
}

function validMonth(period: string): Date {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) {
        throw new Error('Invalid invoice period');
    }

    const [year, month] = period.split('-').map(Number);
    const parsed = new Date(Date.UTC(year, month - 1, 1));

    if (parsed.getUTCFullYear() !== year) {
        throw new Error('Invalid invoice period');
    }

    return parsed;
}

export function getInvoicePeriod(date: Date, closingDay: number): string {
    if (!validDay(closingDay) || Number.isNaN(date.getTime())) {
        throw new Error('Invalid billing cycle date');
    }

    const start = monthStart(date);
    const closingDate = Math.min(
        closingDay,
        lastDay(start.getUTCFullYear(), start.getUTCMonth()),
    );
    const periodStart = date.getUTCDate() > closingDate
        ? addMonthsClamped(start, 1)
        : start;

    return monthKey(periodStart);
}

export function getInvoiceDueDate(
    period: string,
    closingDay: number,
    dueDay: number,
): Date {
    const start = validMonth(period);

    if (!validDay(closingDay) || !validDay(dueDay)) {
        throw new Error('Invalid billing cycle');
    }

    const closing = Math.min(
        closingDay,
        lastDay(start.getUTCFullYear(), start.getUTCMonth()),
    );
    const thisMonthDue = Math.min(
        dueDay,
        lastDay(start.getUTCFullYear(), start.getUTCMonth()),
    );

    if (thisMonthDue > closing) {
        return new Date(Date.UTC(
            start.getUTCFullYear(),
            start.getUTCMonth(),
            thisMonthDue,
        ));
    }

    const nextMonth = addMonthsClamped(start, 1);

    return new Date(Date.UTC(
        nextMonth.getUTCFullYear(),
        nextMonth.getUTCMonth(),
        Math.min(
            dueDay,
            lastDay(nextMonth.getUTCFullYear(), nextMonth.getUTCMonth()),
        ),
    ));
}

export function buildCardInvoice(
    card: InvoiceCard,
    period: string,
    purchases: CardPurchase[],
    expenses: ManualCardExpense[],
) {
    const target = validMonth(period);

    if (!validDay(card.closingDay) || !validDay(card.dueDay)) {
        throw new Error('Card billing cycle is not configured');
    }

    const lines: InvoiceLine[] = [];
    const linkedIds = new Set(
        expenses.map((expense) => expense.linkedTransactionId).filter(Boolean),
    );

    for (const purchase of purchases) {
        if (getInvoicePeriod(purchase.occurredAt, card.closingDay) !== period) {
            continue;
        }

        lines.push({
            id: purchase.id,
            description: purchase.description,
            amountInCents: purchase.amountInCents,
            installmentLabel: null,
            source: 'IMPORTED',
        });
    }

    for (const expense of expenses) {
        if (expense.linkedTransactionId && linkedIds.has(expense.linkedTransactionId)) {
            // Explicitly linked entries are represented only by the imported transaction.
            continue;
        }

        const startingPeriod = getInvoicePeriod(
            expense.date ?? expense.createdAt,
            card.closingDay,
        );
        const installment = monthOffset(validMonth(startingPeriod), target);

        if (installment < 0 || installment >= expense.installments) {
            continue;
        }

        const count = BigInt(expense.installments);
        const base = expense.amountInCents / count;
        const remainder = expense.amountInCents % count;

        lines.push({
            id: `${expense.id}:${installment + 1}`,
            description: expense.description,
            amountInCents: base + (
                BigInt(installment) < remainder ? BigInt(1) : BigInt(0)
            ),
            installmentLabel: expense.installments > 1
                ? `${installment + 1}/${expense.installments}`
                : null,
            source: 'MANUAL',
        });
    }

    return {
        period,
        cardId: card.id,
        closingDay: card.closingDay,
        dueDate: getInvoiceDueDate(period, card.closingDay, card.dueDay),
        lines,
        totalInCents: lines.reduce(
            (total, line) => total + line.amountInCents,
            BigInt(0),
        ),
    };
}
