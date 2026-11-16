type Candidate = {
    providerTransactionId: string;
    cardId: string;
    amountInCents: bigint;
    occurredAt: Date;
    description: string;
};
type Existing = {
    providerTransactionId: string;
    cardId: string;
    amountInCents?: bigint;
};
type Conflict = { candidate: Candidate; existing: Existing | Candidate };

function keyOf(value: { cardId: string; providerTransactionId: string }) {
    return JSON.stringify([value.cardId, value.providerTransactionId]);
}

/**
 * A non-mutating preview for provider imports. Callers must scope the existing
 * records to the authenticated owner before passing them to this function.
 */
export function reconcileImportedTransactions(candidates: Candidate[], existing: Existing[]) {
    const known = new Map<string, Existing | Candidate>();
    for (const item of existing) {
        if (!item.cardId.trim() || !item.providerTransactionId.trim()) {
            throw new Error('Invalid existing transaction identity');
        }
        known.set(keyOf(item), item);
    }

    const toImport: Candidate[] = [];
    const duplicates: Candidate[] = [];
    const conflicts: Conflict[] = [];

    for (const candidate of candidates) {
        if (!candidate.cardId.trim() || !candidate.providerTransactionId.trim()
            || !candidate.description.trim()
            || candidate.amountInCents <= BigInt(0)
            || candidate.amountInCents > BigInt('9223372036854775807')
            || Number.isNaN(candidate.occurredAt.getTime())) {
            throw new Error('Invalid imported transaction');
        }

        const key = keyOf(candidate);
        const previous = known.get(key);
        if (!previous) {
            toImport.push(candidate);
            known.set(key, candidate);
        } else if (previous.amountInCents !== undefined
            && previous.amountInCents !== candidate.amountInCents) {
            conflicts.push({ candidate, existing: previous });
        } else {
            duplicates.push(candidate);
        }
    }

    return { toImport, duplicates, conflicts };
}
