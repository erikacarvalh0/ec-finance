import type { PrismaClient } from '@prisma/client';
import { buildMonthlyForecast, type ForecastExpense } from '../forecast/schedule';
import { parseExpenseHistoryFilters, type ExpenseHistoryFilters } from './history';

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const labels = { PENDING: 'Pendente', SETTLED: 'Paga', CANCELED: 'Cancelada' } as const;
const methods: Record<string, string> = { PIX: 'Pix', CREDIT: 'Crédito', DEBIT: 'Débito', AUTOMATIC_DEBIT: 'Débito automático', OTHER: 'Outros' };
type Status = keyof typeof labels;

export function mapExpenseTableRows(expense: ForecastExpense & { occurrences: Array<{ dueMonth: Date; status: Status; actualAmountInCents: bigint | null }> }, month: string, status: Status | undefined, category: string) {
    return buildMonthlyForecast({ start: new Date(month + '-01T00:00:00Z'), monthCount: 1, expenses: [expense], incomes: [] })[0].expenses.flatMap(item => {
        const occurrence = expense.occurrences.find(entry => entry.dueMonth.toISOString().slice(0, 7) === month);
        const state = occurrence?.status ?? 'PENDING';
        if (status && state !== status) return [];
        const amount = state === 'SETTLED' ? occurrence?.actualAmountInCents ?? item.amountInCents : item.amountInCents;
        return [{
            id: expense.id + ':' + month, month, state,
            date: item.dueDate.toISOString().slice(0, 10).split('-').reverse().join('/'),
            description: expense.description, category, paymentMethod: methods[expense.paymentMethod] ?? expense.paymentMethod,
            installments: item.installmentNumber + '/' + item.installmentCount,
            amount: currency.format(Number(amount) / 100), status: labels[state],
        }];
    });
}

export async function listExpenseTableRecords(database: Pick<PrismaClient, 'expense'>, userId: string, input: ExpenseHistoryFilters) {
    if (!userId.trim()) throw new Error('Authenticated user ID is required');
    const filters = parseExpenseHistoryFilters(input);
    const month = filters.month ?? new Date().toISOString().slice(0, 7);
    const start = new Date(month + '-01T00:00:00Z');
    const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
    const rows = await database.expense.findMany({
        where: {
            userId, archivedAt: filters.archived ? { not: null } : null,
            OR: [{ date: { lt: end } }, { date: null, createdAt: { lt: end } }],
            ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
            ...(filters.type ? { type: filters.type } : {}),
            ...(filters.paymentMethod ? { paymentMethod: filters.paymentMethod } : {}),
            ...(filters.search ? { description: { contains: filters.search, mode: 'insensitive' } } : {}),
        },
        include: { occurrences: { where: { userId } } },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
    return rows.filter(expense => mapExpenseTableRows(expense, month, filters.status, '').length > 0);
}
