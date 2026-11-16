type Valuation = { amountInCents: bigint; recordedAt: Date };
type PortfolioInvestment = { id: string; name: string; snapshots: Valuation[] };

/**
 * Snapshot-only estimate. No bank balances or unsnapshotted contributions are inferred.
 * Different investments may have valuations from different dates.
 */
export function summarizeInvestmentPortfolio(investments: PortfolioInvestment[]) {
    let totalInCents = BigInt(0);
    let valuedCount = 0;
    let unvaluedCount = 0;
    let latestValuationAt: Date | null = null;

    for (const investment of investments) {
        const latest = investment.snapshots.reduce<Valuation | null>((current, snapshot) =>
            !current || snapshot.recordedAt > current.recordedAt ? snapshot : current,
        null);

        if (!latest) {
            unvaluedCount += 1;
            continue;
        }

        valuedCount += 1;
        totalInCents += latest.amountInCents;
        if (!latestValuationAt || latest.recordedAt > latestValuationAt) {
            latestValuationAt = latest.recordedAt;
        }
    }

    return { totalInCents, valuedCount, unvaluedCount, latestValuationAt };
}
