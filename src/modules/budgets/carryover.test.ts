import { describe, expect, it } from 'vitest';
import { calculateBudgetCarryover, previousBudgetPeriod } from './carryover';

describe('monthly budget carryover preview', () => {
    it('handles December to January transitions', () => {
        expect(previousBudgetPeriod('2027-01')).toBe('2026-12');
        expect(previousBudgetPeriod('2027-03')).toBe('2027-02');
    });

    it('adds unspent previous budget to the current remaining amount', () => {
        expect(calculateBudgetCarryover({
            previousLimitInCents: BigInt(10000),
            previousSpentInCents: BigInt(6000),
            currentLimitInCents: BigInt(12000),
            currentSpentInCents: BigInt(5000),
        })).toEqual({
            previousUnusedInCents: BigInt(4000),
            currentRemainingInCents: BigInt(7000),
            combinedAvailableInCents: BigInt(11000),
        });
    });

    it('does not carry previous overspending forward as a negative credit', () => {
        expect(calculateBudgetCarryover({
            previousLimitInCents: BigInt(10000),
            previousSpentInCents: BigInt(13000),
            currentLimitInCents: BigInt(12000),
            currentSpentInCents: BigInt(5000),
        }).combinedAvailableInCents).toBe(BigInt(7000));
    });

    it('does not carry over missing previous budgets', () => {
        expect(calculateBudgetCarryover({
            previousLimitInCents: null,
            previousSpentInCents: BigInt(2000),
            currentLimitInCents: BigInt(5000),
            currentSpentInCents: BigInt(1000),
        }).previousUnusedInCents).toBe(BigInt(0));
    });

    it('keeps current overspending visible and never rounds money through Number', () => {
        const result = calculateBudgetCarryover({
            previousLimitInCents: BigInt('90071992547409930'),
            previousSpentInCents: BigInt('90071992547409920'),
            currentLimitInCents: BigInt(100),
            currentSpentInCents: BigInt(120),
        });
        expect(result).toEqual({
            previousUnusedInCents: BigInt(10),
            currentRemainingInCents: BigInt(-20),
            combinedAvailableInCents: BigInt(-10),
        });
    });

    it('rejects invalid periods and negative budget values', () => {
        expect(() => previousBudgetPeriod('2026-13')).toThrow();
        expect(() => calculateBudgetCarryover({
            previousLimitInCents: BigInt(-1),
            previousSpentInCents: BigInt(0),
            currentLimitInCents: BigInt(100),
            currentSpentInCents: BigInt(0),
        })).toThrow();
    });
});
