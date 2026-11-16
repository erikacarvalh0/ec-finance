export interface NetWorthBalances {
    investmentsInCents: bigint;
    otherAssetsInCents: bigint;
    mortgageBalanceInCents: bigint;
    otherDebtsInCents: bigint;
}

/** Snapshot balances only: never infer outstanding mortgage principal. */
export function calculateNetWorth(balances: NetWorthBalances) {
    if (Object.values(balances).some(value => value < BigInt(0))) {
        throw new Error('Net worth balances must be non-negative');
    }
    const assetsInCents = balances.investmentsInCents + balances.otherAssetsInCents;
    const liabilitiesInCents = balances.mortgageBalanceInCents + balances.otherDebtsInCents;
    return {
        assetsInCents,
        liabilitiesInCents,
        netWorthInCents: assetsInCents - liabilitiesInCents,
    };
}
