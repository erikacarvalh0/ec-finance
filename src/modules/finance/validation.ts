import { z } from 'zod';

const positiveMoney = z.string()
    .regex(/^[1-9][0-9]*$/, 'Amount must be a positive integer in cents')
    .max(18);

const nonNegativeMoney = z.string()
    .regex(/^(0|[1-9][0-9]*)$/, 'Amount must be a non-negative integer in cents')
    .max(18);

const dateSchema = z.iso.date();

export const expenseInputSchema = z.object({
    description: z.string().trim().min(1).max(255),
    amountInCents: positiveMoney,
    paymentMethod: z.enum(['PIX', 'CREDIT', 'DEBIT', 'AUTOMATIC_DEBIT', 'OTHER']),
    type: z.enum(['FIXED', 'VARIABLE']),
    date: dateSchema.optional(),
    installments: z.number().int().min(1).max(120).default(1),
});

export const incomeInputSchema = z.discriminatedUnion('type', [
    z.object({
        type: z.literal('SALARY'),
        amountInCents: positiveMoney,
    }),
    z.object({
        type: z.literal('OTHER'),
        amountInCents: positiveMoney,
    }),
    z.object({
        type: z.literal('RECURRING'),
        amountInCents: positiveMoney,
        responsible: z.string().trim().min(1).max(150),
        description: z.string().trim().min(1).max(255),
        date: dateSchema,
    }),
]);

export const investmentInputSchema = z.object({
    name: z.string().trim().min(1).max(120),
});

export const investmentSnapshotInputSchema = z.object({
    amountInCents: nonNegativeMoney,
    recordedAt: dateSchema,
});
