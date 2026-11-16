type Valuation = { recordedAt: Date; amountInCents: bigint };
type Cashflow = {
    occurredAt: Date;
    type: 'DEPOSIT' | 'WITHDRAWAL';
    amountInCents: bigint;
};

export type TimeWeightedReturn = {
    percentage: number | null;
    method: 'TWR' | 'UNAVAILABLE_VALUATIONS'
        | 'MISSING_CASHFLOW_BOUNDARY_VALUATION' | 'INVALID_VALUATION';
};

/**
 * Geometrically links returns between external flows. A valuation at the same
 * timestamp as a flow is interpreted as the value immediately BEFORE the flow.
 * No interpolation is performed when a flow boundary valuation is missing.
 */
export function calculateTimeWeightedReturn(
    valuations: Valuation[],
    cashflows: Cashflow[],
): TimeWeightedReturn {
    const sorted = [...valuations].sort((a, b) => a.recordedAt.getTime() - b.recordedAt.getTime());
    const first = sorted[0];
    const last = sorted.at(-1);
    if (!first || !last || first.recordedAt.getTime() >= last.recordedAt.getTime()) {
        return { percentage: null, method: 'UNAVAILABLE_VALUATIONS' };
    }
    if (sorted.some((item) => item.amountInCents < BigInt(0)
        || !Number.isFinite(item.recordedAt.getTime()))
        || first.amountInCents <= BigInt(0)) {
        return { percentage: null, method: 'INVALID_VALUATION' };
    }
    const flows = cashflows.filter((item) => item.occurredAt > first.recordedAt
        && item.occurredAt < last.recordedAt)
        .sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
    let segmentStart = first.amountInCents;
    let growthFactor = 1;
    for (let index = 0; index < flows.length;) {
        const timestamp = flows[index].occurredAt.getTime();
        const boundary = sorted.find((item) => item.recordedAt.getTime() === timestamp);
        if (!boundary) {
            return { percentage: null, method: 'MISSING_CASHFLOW_BOUNDARY_VALUATION' };
        }
        if (segmentStart <= BigInt(0)) {
            return { percentage: null, method: 'INVALID_VALUATION' };
        }
        growthFactor *= Number(boundary.amountInCents) / Number(segmentStart);
        let adjustment = BigInt(0);
        while (index < flows.length && flows[index].occurredAt.getTime() === timestamp) {
            const flow = flows[index];
            if (flow.amountInCents <= BigInt(0)) {
                return { percentage: null, method: 'INVALID_VALUATION' };
            }
            adjustment += flow.type === 'DEPOSIT' ? flow.amountInCents : -flow.amountInCents;
            index += 1;
        }
        segmentStart = boundary.amountInCents + adjustment;
    }
    if (segmentStart <= BigInt(0)) {
        return { percentage: null, method: 'INVALID_VALUATION' };
    }
    growthFactor *= Number(last.amountInCents) / Number(segmentStart);
    if (!Number.isFinite(growthFactor)) {
        return { percentage: null, method: 'INVALID_VALUATION' };
    }
    return { percentage: Math.round((growthFactor - 1) * 10000) / 100, method: 'TWR' };
}
