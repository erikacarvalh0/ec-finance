type Allocation = {
    investmentId: string;
    authorized: boolean;
    allocatedInCents: bigint;
};

export function calculateLinkedGoalSavings(manualOnlyInCents: bigint, allocations: Allocation[]) {
    if (manualOnlyInCents < BigInt(0)) throw new Error('Invalid manual savings');
    const seen = new Map<string, bigint>();
    for (const allocation of allocations) {
        if (!allocation.authorized) continue;
        if (allocation.allocatedInCents < BigInt(0)) throw new Error('Invalid allocation');
        const previous = seen.get(allocation.investmentId);
        if (previous !== undefined && previous !== allocation.allocatedInCents) {
            throw new Error('Conflicting investment allocations');
        }
        seen.set(allocation.investmentId, allocation.allocatedInCents);
    }
    return Array.from(seen.values()).reduce((sum, amount) => sum + amount, manualOnlyInCents);
}
