import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';

type Database = Pick<PrismaClient, 'creditCard' | 'transaction' | 'expense' | 'invoicePayment'>;

const limitSchema = z.object({
    creditLimitInCents: z.string().regex(/^[1-9][0-9]*$/).max(18),
});

export function calculateCardLimit(
    creditLimitInCents: bigint,
    alreadyUsedInCents: bigint,
    expenses: Array<{ amountInCents: bigint; linkedTransactionId: string | null }> = [],
    transactions: Array<{ id: string; amountInCents: bigint }> = [],
) {
    if (creditLimitInCents <= BigInt(0)) throw new Error('Invalid card limit');
    const manual = expenses
        .filter(expense => expense.linkedTransactionId === null)
        .reduce((sum, expense) => sum + expense.amountInCents, BigInt(0));
    const imported = transactions.reduce((sum, transaction) => sum + transaction.amountInCents, BigInt(0));
    const estimatedUsedInCents = alreadyUsedInCents + manual + imported;
    const estimatedAvailableInCents = creditLimitInCents - estimatedUsedInCents;
    const utilizationPercentage = Number(
        estimatedUsedInCents * BigInt(100) / creditLimitInCents,
    );
    return {
        creditLimitInCents,
        estimatedUsedInCents,
        estimatedAvailableInCents,
        utilizationPercentage,
    };
}

export async function configureCardLimit(
    database: Database,
    userId: string,
    cardId: string,
    input: { creditLimitInCents: string },
) {
    if (!userId.trim() || !cardId.trim()) throw new Error('Authenticated owner and card ID required');
    const parsed = limitSchema.parse(input);
    const creditLimitInCents = BigInt(parsed.creditLimitInCents);
    if (creditLimitInCents > BigInt('9223372036854775807')) {
        throw new Error('Card limit exceeds supported range');
    }
    const card = await database.creditCard.findFirst({
        where: { id: cardId, userId },
        select: { id: true, creditLimitInCents: true },
    });
    if (!card) throw new Error('Card not found');
    return database.creditCard.update({
        where: { id: cardId, userId },
        data: { creditLimitInCents },
    });
}

export async function getCardLimitOverview(
    database: Database,
    userId: string,
    cardId: string,
) {
    if (!userId.trim() || !cardId.trim()) throw new Error('Authenticated owner and card ID required');
    const card = await database.creditCard.findFirst({
        where: { id: cardId, userId },
        select: { id: true, creditLimitInCents: true },
    });
    if (!card) throw new Error('Card not found');
    if (card.creditLimitInCents === null) return null;

    const [transactions, expenses, payments] = await Promise.all([
        database.transaction.findMany({
            where: { userId, cardId },
            select: { id: true, amountInCents: true },
        }),
        database.expense.findMany({
            where: { userId, cardId, paymentMethod: 'CREDIT' },
            select: { amountInCents: true, linkedTransactionId: true },
        }),
        database.invoicePayment.findMany({
            where: { userId, cardId },
            select: { amountInCents: true },
        }),
    ]);
    const recordedPaid = payments.reduce((sum, item) => sum + item.amountInCents, BigInt(0));
    const estimate = calculateCardLimit(card.creditLimitInCents, -recordedPaid, expenses, transactions);
    return {
        ...estimate,
        // This uses recorded purchases since account creation; bank-authorized
        // holds, fees, refunds and pre-existing card balances are not known.
        calculation: 'RECORDED_ESTIMATE' as const,
    };
}
