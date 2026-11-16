import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const movementSchema = z.object({
    type: z.enum(['DEPOSIT', 'WITHDRAWAL']),
    amountInCents: z.string().regex(/^[1-9][0-9]*$/).max(19),
}).strict();

export function parseGoalMovement(input: unknown) {
    const parsed = movementSchema.parse(input);
    const amountInCents = BigInt(parsed.amountInCents);
    if (amountInCents > BigInt('9223372036854775807')) {
        throw new Error('Invalid goal movement amount');
    }
    return { type: parsed.type, amountInCents };
}

export async function recordGoalMovement(
    database: Pick<PrismaClient, '$transaction'>,
    userId: string,
    goalId: string,
    input: unknown,
) {
    if (!userId.trim() || !goalId.trim()) {
        throw new Error('Authenticated user and goal are required');
    }
    const parsed = parseGoalMovement(input);
    return database.$transaction(async (transaction) => {
        const changed = await transaction.financialGoal.updateMany({
            where: {
                id: goalId,
                userId,
                ...(parsed.type === 'WITHDRAWAL'
                    ? { savedInCents: { gte: parsed.amountInCents } }
                    : { savedInCents: { lte: BigInt('9223372036854775807') - parsed.amountInCents } }),
            },
            data: {
                savedInCents: parsed.type === 'DEPOSIT'
                    ? { increment: parsed.amountInCents }
                    : { decrement: parsed.amountInCents },
            },
        });
        if (changed.count !== 1) {
            throw new Error('Goal not found or insufficient balance');
        }
        return transaction.financialGoalMovement.create({
            data: {
                userId, goalId, type: parsed.type, amountInCents: parsed.amountInCents,
            },
        });
    });
}

export async function listGoalMovements(
    database: Pick<PrismaClient, 'financialGoal' | 'financialGoalMovement'>,
    userId: string,
    goalId: string,
) {
    if (!userId.trim() || !goalId.trim()) {
        throw new Error('Authenticated user and goal are required');
    }
    const goal = await database.financialGoal.findFirst({
        where: { id: goalId, userId }, select: { id: true },
    });
    if (!goal) throw new Error('Goal not found');
    return database.financialGoalMovement.findMany({
        where: { goalId, userId },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 100,
    });
}
