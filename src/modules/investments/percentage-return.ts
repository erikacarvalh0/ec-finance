type Valuation = {
    amountInCents: bigint;
    recordedAt: Date;
};

type Cashflow = {
    type: 'DEPOSIT' | 'WITHDRAWAL';
    amountInCents: bigint;
    occurredAt: Date;
};

export type InvestmentPercentageReturn =
    | { percentage: number; method: 'SIMPLE_RETURN' }
    | {
        percentage: null;
        method: 'UNAVAILABLE_VALUATIONS'
            | 'UNAVAILABLE_STARTING_BALANCE'
            | 'UNAVAILABLE_EXTERNAL_CASHFLOWS';
    };

/**
 * Reports a simple holding-period return only when no external cash flows
 * occur within the valuation interval. Otherwise TWR/MWR would be required.
 *
 * The percentage is rounded to two decimal places using integer arithmetic,
 * avoiding precision loss when balances exceed Number.MAX_SAFE_INTEGER.
 */
export function calculateInvestmentSimpleReturn(
    valuations: Valuation[],
    cashflows: Cashflow[],
): InvestmentPercentageReturn {
    const sorted = [...valuations].sort(
        (a, b) => a.recordedAt.getTime() - b.recordedAt.getTime(),
    );
    const first = sorted[0];
    const last = sorted.at(-1);

    if (!first || !last || first.recordedAt.getTime() === last.recordedAt.getTime()) {
        return { percentage: null, method: 'UNAVAILABLE_VALUATIONS' };
    }

    if (first.amountInCents <= BigInt(0)) {
        return { percentage: null, method: 'UNAVAILABLE_STARTING_BALANCE' };
    }

    if (cashflows.some((cashflow) => (
        cashflow.occurredAt >= first.recordedAt
        && cashflow.occurredAt <= last.recordedAt
    ))) {
        return { percentage: null, method: 'UNAVAILABLE_EXTERNAL_CASHFLOWS' };
    }

    // Basis points: 100 basis points = 1%; a BigInt quotient preserves
    // precision at the scale of BRL cents before conversion to Number.
    const difference = last.amountInCents - first.amountInCents;
    const magnitude = difference < BigInt(0) ? -difference : difference;
    // Round ties away from zero for both gains and losses.
    const roundedMagnitude = (magnitude * BigInt(10000) + first.amountInCents / BigInt(2))
        / first.amountInCents;
    const basisPoints = difference < BigInt(0) ? -roundedMagnitude : roundedMagnitude;

    return { percentage: Number(basisPoints) / 100, method: 'SIMPLE_RETURN' };
}
