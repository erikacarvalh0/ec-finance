type Valuation = { recordedAt: Date; amountInCents: bigint };
type Cashflow = {
    occurredAt: Date;
    type: 'DEPOSIT' | 'WITHDRAWAL';
    amountInCents: bigint;
};

export type MoneyWeightedReturn = {
    percentage: number | null;
    method: 'MWR_XIRR' | 'UNAVAILABLE_VALUATIONS'
        | 'UNAVAILABLE_STARTING_BALANCE' | 'INVALID_CASHFLOWS' | 'NO_UNIQUE_SOLUTION';
};

const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;

/**
 * Annualized investor-perspective XIRR. Deposits are negative cash flows,
 * withdrawals positive. Initial valuation is invested capital (negative)
 * and final valuation is liquidation proceeds (positive).
 * A single sign-changing bracket is required; no arbitrary result is returned
 * for irregular or unsolvable cashflow patterns.
 */
export function calculateMoneyWeightedReturn(
    valuations: Valuation[],
    cashflows: Cashflow[],
): MoneyWeightedReturn {
    const sorted = [...valuations].sort((a, b) => a.recordedAt.getTime() - b.recordedAt.getTime());
    const first = sorted[0];
    const last = sorted.at(-1);
    if (!first || !last || first.recordedAt.getTime() >= last.recordedAt.getTime()) {
        return { percentage: null, method: 'UNAVAILABLE_VALUATIONS' };
    }
    if (first.amountInCents <= BigInt(0)) {
        return { percentage: null, method: 'UNAVAILABLE_STARTING_BALANCE' };
    }
    if (last.amountInCents < BigInt(0) || cashflows.some((flow) =>
        flow.amountInCents <= BigInt(0)
        || !Number.isFinite(flow.occurredAt.getTime())
        || flow.occurredAt <= first.recordedAt
        || flow.occurredAt >= last.recordedAt)) {
        return { percentage: null, method: 'INVALID_CASHFLOWS' };
    }
    const entries = [
        { date: first.recordedAt.getTime(), amount: -Number(first.amountInCents) },
        ...cashflows.map((flow) => ({
            date: flow.occurredAt.getTime(),
            amount: Number(flow.amountInCents) * (flow.type === 'DEPOSIT' ? -1 : 1),
        })),
        { date: last.recordedAt.getTime(), amount: Number(last.amountInCents) },
    ];
    if (entries.some((entry) => !Number.isFinite(entry.amount))) {
        return { percentage: null, method: 'INVALID_CASHFLOWS' };
    }
    const npv = (rate: number) => entries.reduce((sum, entry) =>
        sum + entry.amount / Math.pow(1 + rate,
            (entry.date - first.recordedAt.getTime()) / MS_PER_YEAR), 0);
    let low = -0.999999;
    let high = 1000000;
    let lowValue = npv(low);
    const highValue = npv(high);
    if (!Number.isFinite(lowValue) || !Number.isFinite(highValue)
        || lowValue * highValue > 0) {
        return { percentage: null, method: 'NO_UNIQUE_SOLUTION' };
    }
    for (let index = 0; index < 160; index += 1) {
        const mid = (low + high) / 2;
        const midValue = npv(mid);
        if (!Number.isFinite(midValue)) {
            return { percentage: null, method: 'NO_UNIQUE_SOLUTION' };
        }
        if (midValue === 0) {
            low = mid;
            high = mid;
            break;
        }
        if (lowValue * midValue > 0) {
            low = mid;
            lowValue = midValue;
        } else {
            high = mid;
        }
    }
    const percentage = ((low + high) / 2) * 100;
    return Number.isFinite(percentage)
        ? { percentage: Math.round(percentage * 100) / 100, method: 'MWR_XIRR' }
        : { percentage: null, method: 'NO_UNIQUE_SOLUTION' };
}
