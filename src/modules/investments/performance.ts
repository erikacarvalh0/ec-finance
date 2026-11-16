type Valuation = {
    amountInCents: bigint;
    recordedAt: Date;
};
type Cashflow = {
    type: 'DEPOSIT' | 'WITHDRAWAL';
    amountInCents: bigint;
    occurredAt: Date;
};

export function summarizeInvestmentPerformance(
    valuations: Valuation[],
    cashflows: Cashflow[],
) {
    const sorted = [...valuations].sort(
        (a, b) => a.recordedAt.getTime() - b.recordedAt.getTime(),
    );
    const first = sorted[0] ?? null;
    const last = sorted.at(-1) ?? null;
    const relevant = first === null ? cashflows : cashflows.filter(
        (cashflow) => cashflow.occurredAt >= first.recordedAt
            && cashflow.occurredAt <= last!.recordedAt,
    );
    const depositedInCents = relevant
        .filter((cashflow) => cashflow.type === 'DEPOSIT')
        .reduce((sum, cashflow) => sum + cashflow.amountInCents, BigInt(0));
    const withdrawnInCents = relevant
        .filter((cashflow) => cashflow.type === 'WITHDRAWAL')
        .reduce((sum, cashflow) => sum + cashflow.amountInCents, BigInt(0));
    const netCashflowInCents = depositedInCents - withdrawnInCents;

    return {
        currentBalanceInCents: last?.amountInCents ?? null,
        depositedInCents,
        withdrawnInCents,
        netCashflowInCents,
        estimatedGainInCents: first && last && first.recordedAt.getTime() < last.recordedAt.getTime()
            ? last.amountInCents - first.amountInCents - netCashflowInCents
            : null,
    };
}
