import type { PrismaClient } from '@prisma/client';

type Entry = { amountInCents: bigint; date: Date | null; createdAt: Date; type: 'SALARY' | 'RECURRING' | 'OTHER' };

export function summarizeIncomeCharts(entries: Entry[], now: Date) {
    const months = Array.from({ length: 6 }, (_, index) => ({
        date: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5 + index, 1)),
        cents: BigInt(0),
    }));
    const types = [
        { type: 'SALARY', name: 'Salário', color: '#08A99B', cents: BigInt(0) },
        { type: 'RECURRING', name: 'Recorrente', color: '#7628EA', cents: BigInt(0) },
        { type: 'OTHER', name: 'Eventual', color: '#3448EF', cents: BigInt(0) },
    ];
    for (const entry of entries) {
        const date = entry.date ?? entry.createdAt;
        const index = months.findIndex(month => month.date.getUTCFullYear() === date.getUTCFullYear() && month.date.getUTCMonth() === date.getUTCMonth());
        if (index < 0) continue;
        months[index].cents += entry.amountInCents;
        if (index === 5) {
            const type = types.find(item => item.type === entry.type);
            if (type) type.cents += entry.amountInCents;
        }
    }
    return { months, types, total: months[5].cents };
}

export async function getIncomeCharts(database: Pick<PrismaClient, 'income'>, userId: string, now = new Date()) {
    if (!userId.trim()) throw new Error('Authenticated user is required');
    const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1));
    const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    const entries = await database.income.findMany({
        where: { userId, OR: [{ date: { gte: from, lt: to } }, { date: null, createdAt: { gte: from, lt: to } }] },
        select: { amountInCents: true, date: true, createdAt: true, type: true },
    });
    return summarizeIncomeCharts(entries, now);
}
