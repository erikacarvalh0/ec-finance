import type { PrismaClient } from '@prisma/client';

type Entry = { amountInCents: bigint; date: Date | null; createdAt: Date };

export function summarizeIncomes(entries: Entry[], now: Date) {
    const current = now.getUTCFullYear() * 12 + now.getUTCMonth();
    const totals = Array.from({ length: 6 }, () => BigInt(0));
    let count = 0;
    for (const entry of entries) {
        const date = entry.date ?? entry.createdAt;
        const offset = current - (date.getUTCFullYear() * 12 + date.getUTCMonth());
        if (offset < 0 || offset >= 6) continue;
        totals[5 - offset] += entry.amountInCents;
        if (offset === 0) count++;
    }
    const total = totals[5];
    const previous = totals[4];
    return {
        total,
        average: (totals.reduce((sum, value) => sum + value, BigInt(0)) + BigInt(3)) / BigInt(6),
        variation: previous === BigInt(0) ? null : Number(total - previous) / Number(previous) * 100,
        count,
    };
}

export async function getIncomeSummary(database: Pick<PrismaClient, 'income'>, userId: string, now = new Date()) {
    if (!userId.trim()) throw new Error('Authenticated user is required');
    const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1));
    const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    const entries = await database.income.findMany({
        where: {
            userId,
            OR: [
                { date: { gte: from, lt: to } },
                { date: null, createdAt: { gte: from, lt: to } },
            ],
        },
        select: { amountInCents: true, date: true, createdAt: true },
    });
    return summarizeIncomes(entries, now);
}
