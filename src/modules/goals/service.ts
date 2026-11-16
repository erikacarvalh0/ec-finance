import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';

type Database = Pick<PrismaClient, 'financialGoal'>;

const amount = z.string().regex(/^(0|[1-9][0-9]*)$/).max(18);
const inputSchema = z.object({
    name: z.string().trim().min(1).max(100),
    targetInCents: amount,
    savedInCents: amount,
    deadline: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/).optional(),
}).strict();

const maxAmount = BigInt('9223372036854775807');

function parseDeadline(value: string | undefined) {
    if (!value) return null;
    const date = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
        throw new Error('Invalid goal deadline');
    }
    return date;
}

function requireOwner(userId: string) {
    if (!userId.trim()) throw new Error('Authenticated user is required');
}

export function calculateGoalProgress(savedInCents: bigint, targetInCents: bigint) {
    if (targetInCents <= BigInt(0) || savedInCents < BigInt(0)) {
        throw new Error('Invalid goal amounts');
    }
    const remainingInCents = savedInCents >= targetInCents
        ? BigInt(0) : targetInCents - savedInCents;
    const percentage = Number(
        savedInCents >= targetInCents
            ? BigInt(100) : savedInCents * BigInt(100) / targetInCents
    );
    return { percentage, remainingInCents };
}

export async function createFinancialGoal(
    database: Database,
    userId: string,
    input: z.input<typeof inputSchema>,
) {
    requireOwner(userId);
    const parsed = inputSchema.parse(input);
    const targetInCents = BigInt(parsed.targetInCents);
    const savedInCents = BigInt(parsed.savedInCents);

    if (targetInCents <= BigInt(0) || targetInCents > maxAmount
        || savedInCents > targetInCents || savedInCents > maxAmount) {
        throw new Error('Invalid goal amounts');
    }

    return database.financialGoal.create({
        data: {
            userId,
            name: parsed.name,
            targetInCents,
            savedInCents,
            deadline: parseDeadline(parsed.deadline),
        },
    });
}

export async function listFinancialGoals(database: Database, userId: string) {
    requireOwner(userId);
    return database.financialGoal.findMany({
        where: { userId },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
}
