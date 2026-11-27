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
    cardId: z.string().trim().min(1).optional(),
    categoryId: z.string().trim().min(1).optional(),
}).refine((data) => !data.cardId || data.paymentMethod === 'CREDIT', {
    path: ['cardId'],
    message: 'Only credit purchases can be assigned to a card',
});

export const incomeInputSchema = z.discriminatedUnion('type', [
    z.object({
        type: z.literal('SALARY'),
        amountInCents: positiveMoney,
        categoryId: z.string().trim().min(1).optional(),
    }),
    z.object({
        type: z.literal('OTHER'),
        description: z.string().trim().min(1).max(255).optional(),
        date: dateSchema.optional(),
        amountInCents: positiveMoney,
        categoryId: z.string().trim().min(1).optional(),
    }),
    z.object({
        type: z.literal('RECURRING'),
        amountInCents: positiveMoney,
        categoryId: z.string().trim().min(1).optional(),
        responsible: z.string().trim().min(1).max(150).optional(),
        description: z.string().trim().min(1).max(255),
        date: dateSchema,
    }),
]);

export const investmentInputSchema = z.object({
    name: z.string().trim().min(1).max(120),
    type: z.enum(['Renda Fixa', 'Tesouro Direto', 'Renda Variável', 'Outros']).optional(),
    institution: z.string().trim().max(120).optional(),
    product: z.string().trim().max(120).optional(),
    appliedAt: dateSchema.optional(),
    maturityAt: dateSchema.optional(),
    contractedRate: z.string().trim().max(120).optional(),
    amountInCents: positiveMoney.optional(),
}).refine(d => !d.amountInCents || !!(d.type && d.appliedAt), { path: ['appliedAt'], message: 'Tipo e aplicação obrigatórios' }).refine(d => !d.maturityAt || !!d.appliedAt && d.maturityAt >= d.appliedAt, { path: ['maturityAt'], message: 'Vencimento anterior à aplicação' });

export const investmentSnapshotInputSchema = z.object({
    amountInCents: nonNegativeMoney,
    recordedAt: dateSchema,
});
