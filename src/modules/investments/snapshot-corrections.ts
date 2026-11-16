import type { PrismaClient } from '@prisma/client';
import { investmentSnapshotInputSchema } from '@/modules/finance/validation';

type Database = Pick<PrismaClient, 'investment' | 'investmentSnapshot'>;

function requireIds(userId: string, investmentId: string, snapshotId: string) {
    if (!userId.trim() || !investmentId.trim() || !snapshotId.trim()) {
        throw new Error('Authenticated user, investment and snapshot are required');
    }
}

async function requireOwnedSnapshot(
    database: Database,
    userId: string,
    investmentId: string,
    snapshotId: string,
) {
    const investment = await database.investment.findFirst({
        where: { id: investmentId, userId },
        select: { id: true },
    });

    if (!investment) {
        throw new Error('Investment not found');
    }

    const snapshot = await database.investmentSnapshot.findFirst({
        where: { id: snapshotId, investmentId, userId },
        select: { id: true },
    });

    if (!snapshot) {
        throw new Error('Snapshot not found');
    }
}

export async function correctInvestmentSnapshot(
    database: Database,
    userId: string,
    investmentId: string,
    snapshotId: string,
    input: { amountInCents: string; recordedAt: string },
) {
    requireIds(userId, investmentId, snapshotId);
    const data = investmentSnapshotInputSchema.parse(input);
    const amountInCents = BigInt(data.amountInCents);

    if (amountInCents > BigInt('9223372036854775807')) {
        throw new Error('Amount exceeds the supported range');
    }

    await requireOwnedSnapshot(database, userId, investmentId, snapshotId);

    return database.investmentSnapshot.update({
        where: { id: snapshotId },
        data: {
            amountInCents,
            recordedAt: new Date(`${data.recordedAt}T00:00:00.000Z`),
        },
    });
}

export async function deleteInvestmentSnapshot(
    database: Database,
    userId: string,
    investmentId: string,
    snapshotId: string,
) {
    requireIds(userId, investmentId, snapshotId);
    await requireOwnedSnapshot(database, userId, investmentId, snapshotId);

    return database.investmentSnapshot.delete({
        where: { id: snapshotId },
    });
}
