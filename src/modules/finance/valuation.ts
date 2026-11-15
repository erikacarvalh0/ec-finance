/**
 * Returns the change in whole cents between consecutive investment valuations.
 * A negative value means the investment balance has decreased.
 */
export function calculateValuationChange(current: string, previous: string): number {
    const difference = BigInt(current) - BigInt(previous);

    if (difference > BigInt(Number.MAX_SAFE_INTEGER)
        || difference < BigInt(Number.MIN_SAFE_INTEGER)) {
        throw new Error('Valuation difference exceeds the supported display range');
    }

    return Number(difference);
}
