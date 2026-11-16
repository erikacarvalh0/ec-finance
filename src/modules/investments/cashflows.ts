import { z } from 'zod';
import type { PrismaClient } from '@prisma/client';

type Database = Pick<PrismaClient, 'investment' | 'investmentCashflow'>;

const cashflowSchema = z.object({
    type: z.enum(['DEPOSIT', 'WITHDRAWAL']),
    amountInCents: z.string().regex(/^[1-9][0-9]*$/).max(18),
    occurredAt: z.iso.date(),
});

export async function recordInvestmentCashflow(
    database: Database,
    userId: string,
    investmentId: string,
    input: z.input<typeof cashflowSchema>,
) {
    if (!userId.trim() || !investmentId.trim()) {
        throw new Error('Authenticated owner and investment ID are required');
    }

    const parsed = cashflowSchema.parse(input);
    const amountInCents = BigInt(parsed.amountInCents);

    if (amountInCents > BigInt('9223372036854775807')) {
        throw new Error('Amount exceeds the supported range');
    }

    const investment = await database.investment.findFirst({
        where: { id: investmentId, userId },
        select: { id: true },
    });

    if (!investment) {
        throw new Error('Investment not found');
    }

    return database.investmentCashflow.create({
        data: {
            investmentId,
            userId,
            type: parsed.type,
            amountInCents,
            occurredAt: new Date(`${parsed.occurredAt}T00:00:00.000Z`),
        },
    });
}
