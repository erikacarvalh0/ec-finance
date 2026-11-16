import { monthBounds } from './calculations';

type CarryoverInput = {
    previousLimitInCents: bigint | null;
    previousSpentInCents: bigint;
    currentLimitInCents: bigint;
    currentSpentInCents: bigint;
};

export function previousBudgetPeriod(period: string) {
    const { start } = monthBounds(period);
    const previous = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() - 1, 1));

    return `${previous.getUTCFullYear()}-${String(previous.getUTCMonth() + 1).padStart(2, '0')}`;
}

/**
 * A read-only, one-month carryover preview. It never changes the persisted
 * category budget or its alert thresholds, and never carries debt forward.
 */
export function calculateBudgetCarryover(input: CarryoverInput) {
    const { previousLimitInCents, previousSpentInCents, currentLimitInCents, currentSpentInCents } = input;

    if (currentLimitInCents <= BigInt(0)
        || previousLimitInCents !== null && previousLimitInCents <= BigInt(0)
        || previousSpentInCents < BigInt(0)
        || currentSpentInCents < BigInt(0)) {
        throw new Error('Invalid budget carryover values');
    }

    const previousUnusedInCents = previousLimitInCents === null
        ? BigInt(0)
        : previousLimitInCents > previousSpentInCents
            ? previousLimitInCents - previousSpentInCents
            : BigInt(0);
    const currentRemainingInCents = currentLimitInCents - currentSpentInCents;

    return {
        previousUnusedInCents,
        currentRemainingInCents,
        combinedAvailableInCents: previousUnusedInCents + currentRemainingInCents,
    };
}
