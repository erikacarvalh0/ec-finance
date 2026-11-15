import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { buildMonthlyForecast } from './schedule';

type Database = Pick<
    PrismaClient,
    'expense' | 'income' | 'expenseOccurrence' | 'incomeOccurrence'
>;

const updateSchema = z.object({
    month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
    status: z.enum(['PENDING', 'SETTLED', 'CANCELED']),
    actualAmountInCents: z.string().regex(/^(0|[1-9]\d*)$/).max(18).optional(),
}).superRefine((data, context) => {
    if (data.status !== 'SETTLED' && data.actualAmountInCents !== undefined) {
        context.addIssue({
            code: 'custom',
            path: ['actualAmountInCents'],
            message: 'Only settled occurrences can have a recorded amount',
        });
    }
});

export type OccurrenceUpdate = z.input<typeof updateSchema>;

export async function updateForecastOccurrence(
    database: Database,
    userId: string,
    kind: 'expense' | 'income',
    sourceId: string,
    input: OccurrenceUpdate,
) {
    if (!userId.trim() || !sourceId.trim()) {
        throw new Error('Authenticated user and source are required');
    }

    const parsed = updateSchema.parse(input);
    const [year, month] = parsed.month.split('-').map(Number);
    const dueMonth = new Date(Date.UTC(year, month - 1, 1));

    const source = kind === 'expense'
        ? await database.expense.findFirst({
            where: { id: sourceId, userId },
        })
        : await database.income.findFirst({
            where: { id: sourceId, userId },
        });

    if (!source) {
        throw new Error('Forecast source not found');
    }

    const forecast = buildMonthlyForecast({
        start: dueMonth,
        monthCount: 1,
        expenses: kind === 'expense'
            ? [source as Extract<typeof source, { installments: number }>]
            : [],
        incomes: kind === 'income'
            ? [source as Extract<typeof source, { type: 'SALARY' | 'RECURRING' | 'OTHER' }>]
            : [],
    })[0];
    const exists = kind === 'expense'
        ? forecast.expenses.some((item) => item.sourceId === sourceId)
        : forecast.incomes.some((item) => item.sourceId === sourceId);

    if (!exists) {
        throw new Error('Forecast occurrence not found');
    }

    const amount = parsed.actualAmountInCents !== undefined
        ? BigInt(parsed.actualAmountInCents)
        : null;

    if (amount !== null && amount > BigInt('9223372036854775807')) {
        throw new Error('Recorded amount exceeds the supported range');
    }

    const data = {
        status: parsed.status,
        actualAmountInCents: amount,
        settledAt: parsed.status === 'SETTLED' ? new Date() : null,
    };

    if (kind === 'expense') {
        return database.expenseOccurrence.upsert({
            where: {
                expenseId_dueMonth: {
                    expenseId: sourceId,
                    dueMonth,
                },
            },
            create: {
                ...data,
                userId,
                expenseId: sourceId,
                dueMonth,
            },
            update: data,
        });
    }

    return database.incomeOccurrence.upsert({
        where: {
            incomeId_dueMonth: {
                incomeId: sourceId,
                dueMonth,
            },
        },
        create: {
            ...data,
            userId,
            incomeId: sourceId,
            dueMonth,
        },
        update: data,
    });
}
