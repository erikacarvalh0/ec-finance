/**
 * Zero-return contribution scenario: assumes the contribution is added once per
 * month and that no interest, inflation or bank synchronization is applied.
 */
export function projectGoalContributions(
    targetInCents: bigint,
    savedInCents: bigint,
    monthlyContributionInCents: bigint,
): { months: number | null; reached: boolean } {
    if (targetInCents <= BigInt(0) || savedInCents < BigInt(0)
        || monthlyContributionInCents < BigInt(0)) {
        throw new Error('Invalid goal projection amounts');
    }
    if (savedInCents >= targetInCents) {
        return { months: 0, reached: true };
    }
    if (monthlyContributionInCents === BigInt(0)) {
        return { months: null, reached: false };
    }
    const remaining = targetInCents - savedInCents;
    const months = (remaining + monthlyContributionInCents - BigInt(1))
        / monthlyContributionInCents;
    if (months > BigInt(Number.MAX_SAFE_INTEGER)) {
        return { months: null, reached: false };
    }
    return { months: Number(months), reached: true };
}
