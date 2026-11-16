type Valuation = { recordedAt: Date; amountInCents: bigint };
type Investment = { id: string; snapshots: Valuation[] };

export function summarizePortfolioMonthlyHistory(
    investments: Investment[],
    startYear: number,
    startMonth: number,
    count: number,
) {
    if (!Number.isInteger(startYear) || startYear < 1000 || startYear > 9999
        || !Number.isInteger(startMonth) || startMonth < 1 || startMonth > 12
        || !Number.isInteger(count) || count < 1 || count > 120) {
        throw new Error('Invalid portfolio history window');
    }

    return Array.from({ length: count }, (_, index) => {
        const start = new Date(Date.UTC(startYear, startMonth - 1 + index, 1));
        const nextMonth = new Date(Date.UTC(startYear, startMonth + index, 1));
        let totalInCents = BigInt(0);
        let valuedCount = 0;

        for (const investment of investments) {
            const latest = investment.snapshots.reduce<Valuation | null>((current, snapshot) =>
                snapshot.recordedAt < nextMonth
                    && (!current || snapshot.recordedAt > current.recordedAt)
                    ? snapshot : current,
            null);
            if (latest) {
                totalInCents += latest.amountInCents;
                valuedCount += 1;
            }
        }

        return {
            period: `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, '0')}`,
            totalInCents,
            valuedCount,
            unvaluedCount: investments.length - valuedCount,
        };
    });
}
