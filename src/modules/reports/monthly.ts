import type { PrismaClient } from '@prisma/client';

type Database = Pick<PrismaClient, 'income' | 'expense' | 'transaction'>;

type Entry = { amountInCents: bigint; date: Date };
type ExpenseEntry = Entry & { linkedTransactionId: string | null };

function firstOfMonth(date: Date) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function monthIndex(date: Date) {
    return date.getUTCFullYear() * 12 + date.getUTCMonth();
}

function validateRange(start: Date, count: number) {
    if (!Number.isFinite(start.getTime())
        || !Number.isInteger(count) || count < 1 || count > 36) {
        throw new Error('Invalid reporting period');
    }
}

export function summarizeRecordedCashflow(
    start: Date,
    count: number,
    incomes: Entry[],
    expenses: ExpenseEntry[],
    transactions: Entry[],
) {
    validateRange(start, count);
    const startMonth = firstOfMonth(start);

    const months = Array.from({ length: count }, (_, offset) => {
        const date = new Date(Date.UTC(
            startMonth.getUTCFullYear(),
            startMonth.getUTCMonth() + offset,
            1,
        ));

        return {
            period: `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`,
            incomeInCents: BigInt(0),
            expenseInCents: BigInt(0),
            netInCents: BigInt(0),
        };
    });

    const add = (entry: Entry, kind: 'incomeInCents' | 'expenseInCents') => {
        const index = monthIndex(entry.date) - monthIndex(startMonth);
        if (index >= 0 && index < months.length) {
            months[index][kind] += entry.amountInCents;
        }
    };

    incomes.forEach((income) => add(income, 'incomeInCents'));
    expenses.filter((expense) => expense.linkedTransactionId === null)
        .forEach((expense) => add(expense, 'expenseInCents'));
    transactions.forEach((transaction) => add(transaction, 'expenseInCents'));

    return months.map((month) => ({
        ...month,
        netInCents: month.incomeInCents - month.expenseInCents,
    }));
}

export async function getUserMonthlyCashflowReport(
    database: Database,
    userId: string,
    start: Date,
    count: number,
) {
    if (!userId.trim()) {
        throw new Error('Authenticated user is required');
    }
    validateRange(start, count);

    const from = firstOfMonth(start);
    const to = new Date(Date.UTC(
        from.getUTCFullYear(),
        from.getUTCMonth() + count,
        1,
    ));

    const [incomes, expenses, transactions] = await Promise.all([
        database.income.findMany({
            where: {
                userId,
                OR: [
                    { date: { gte: from, lt: to } },
                    { date: null, createdAt: { gte: from, lt: to } },
                ],
            },
            select: { amountInCents: true, date: true, createdAt: true },
        }),
        database.expense.findMany({
            where: {
                userId,
                OR: [
                    { date: { gte: from, lt: to } },
                    { date: null, createdAt: { gte: from, lt: to } },
                ],
            },
            select: {
                amountInCents: true,
                date: true,
                createdAt: true,
                linkedTransactionId: true,
            },
        }),
        database.transaction.findMany({
            where: { userId, occurredAt: { gte: from, lt: to } },
            select: { amountInCents: true, occurredAt: true },
        }),
    ]);

    return summarizeRecordedCashflow(
        from,
        count,
        incomes.map((entry) => ({
            amountInCents: entry.amountInCents,
            date: entry.date ?? entry.createdAt,
        })),
        expenses.map((entry) => ({
            amountInCents: entry.amountInCents,
            date: entry.date ?? entry.createdAt,
            linkedTransactionId: entry.linkedTransactionId,
        })),
        transactions.map((entry) => ({
            amountInCents: entry.amountInCents,
            date: entry.occurredAt,
        })),
    );
}
