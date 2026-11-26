import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { expenseInputSchema, incomeInputSchema } from './validation';

type Database = Pick<
    PrismaClient,
    'expense' | 'income' | 'expenseOccurrence' | 'incomeOccurrence' | 'category'
>;

const optionalEndDate = z.iso.date().nullable().optional();

const expenseEditSchema = expenseInputSchema.safeExtend({
    endsOn: optionalEndDate,
}).superRefine((value, ctx) => {
    if (value.endsOn && (value.type !== 'FIXED' || value.installments > 1)) {
        ctx.addIssue({
            code: 'custom',
            path: ['endsOn'],
            message: 'Only monthly fixed expenses can have an end date',
        });
    }

    if (value.endsOn && value.date && value.endsOn < value.date) {
        ctx.addIssue({
            code: 'custom',
            path: ['endsOn'],
            message: 'End date must not precede the start date',
        });
    }
});

const incomeEditSchema = z.discriminatedUnion('type', [
    z.object({
        type: z.literal('SALARY'),
        amountInCents: z.string().regex(/^[1-9]\d*$/).max(18),
        categoryId: z.string().trim().min(1).nullable().optional(),
        endsOn: z.null().optional(),
    }),
    z.object({
        type: z.literal('OTHER'),
        amountInCents: z.string().regex(/^[1-9]\d*$/).max(18),
        categoryId: z.string().trim().min(1).nullable().optional(),
        endsOn: z.null().optional(),
    }),
    z.object({
        type: z.literal('RECURRING'),
        amountInCents: z.string().regex(/^[1-9]\d*$/).max(18),
        categoryId: z.string().trim().min(1).nullable().optional(),
        responsible: z.string().trim().min(1).max(150),
        description: z.string().trim().min(1).max(255),
        date: z.iso.date(),
        endsOn: optionalEndDate,
    }).refine((data) => !data.endsOn || data.endsOn >= data.date, {
        path: ['endsOn'],
        message: 'End date must not precede the start date',
    }),
]);

function toDate(value: string | null | undefined): Date | null {
    return value ? new Date(`${value}T00:00:00.000Z`) : null;
}

function requireValidAmount(value: string): bigint {
    const cents = BigInt(value);

    if (cents > BigInt('9223372036854775807')) {
        throw new Error('Amount exceeds the supported range');
    }

    return cents;
}

export async function updateOwnedExpense(
    database: Database,
    userId: string,
    expenseId: string,
    input: z.input<typeof expenseEditSchema>,
) {
    if (!userId.trim() || !expenseId.trim()) {
        throw new Error('Authenticated owner and record ID are required');
    }

    const data = expenseEditSchema.parse(input);
    const amountInCents = requireValidAmount(data.amountInCents);
    const existing = await database.expense.findFirst({
        where: { id: expenseId, userId },
        select: { id: true, type: true, installments: true },
    });

    if (!existing) {
        throw new Error('Record not found');
    }

    const settledCount = await database.expenseOccurrence.count({
        where: {
            expenseId,
            userId,
            status: 'SETTLED',
        },
    });

    if (settledCount > 0) {
        throw new Error('Settled occurrences prevent editing');
    }

    if (data.categoryId) {
        const category = await database.category.findFirst({
            where: { id: data.categoryId, userId, type: 'EXPENSE' },
            select: { id: true },
        });

        if (!category) {
            throw new Error('Category not found');
        }
    }

    return database.expense.update({
        where: { id: expenseId, userId },
        data: {
            description: data.description,
            amountInCents,
            paymentMethod: data.paymentMethod,
            type: data.type,
            date: toDate(data.date),
            installments: data.installments,
            categoryId: data.categoryId ?? null,
            endsOn: toDate(data.endsOn),
        },
    });
}

export async function updateOwnedIncome(
    database: Database,
    userId: string,
    incomeId: string,
    input: z.input<typeof incomeEditSchema>,
) {
    if (!userId.trim() || !incomeId.trim()) {
        throw new Error('Authenticated owner and record ID are required');
    }

    const data = incomeEditSchema.parse(input);
    const amountInCents = requireValidAmount(data.amountInCents);
    const existing = await database.income.findFirst({
        where: { id: incomeId, userId },
        select: { id: true, type: true },
    });

    if (!existing) {
        throw new Error('Record not found');
    }

    const settledCount = await database.incomeOccurrence.count({
        where: {
            incomeId,
            userId,
            status: 'SETTLED',
        },
    });

    if (settledCount > 0) {
        throw new Error('Settled occurrences prevent editing');
    }

    if (data.categoryId && !await database.category.findFirst({
        where: { id: data.categoryId, userId, type: 'INCOME' },
        select: { id: true },
    })) throw new Error('Category not found');

    return database.income.update({
        where: { id: incomeId, userId },
        data: {
            amountInCents,
            type: data.type,
            ...(data.categoryId !== undefined ? { categoryId: data.categoryId } : {}),
            responsible: data.type === 'RECURRING' ? data.responsible : null,
            description: data.type === 'RECURRING' ? data.description : null,
            date: data.type === 'RECURRING' ? toDate(data.date) : null,
            endsOn: data.type === 'RECURRING' ? toDate(data.endsOn) : null,
        },
    });
}
