export interface ScenarioMonth {
    period: string;
    incomeInCents: bigint;
    expenseInCents: bigint;
}
export interface ScenarioSettings {
    incomeChangePercent: number;
    expenseChangePercent: number;
}
export function validateScenario(input: ScenarioSettings): ScenarioSettings {
    for (const value of [input.incomeChangePercent, input.expenseChangePercent]) {
        if (!Number.isFinite(value) || !Number.isInteger(value) || value < -100 || value > 1000) {
            throw new Error('Scenario percentage must be an integer between -100 and 1000');
        }
    }
    return input;
}
function adjustedCents(value: bigint, percentage: number): bigint {
    const factor = BigInt(100 + percentage);
    return (value * factor + BigInt(50)) / BigInt(100);
}
export function simulateCashflow(months: ScenarioMonth[], input: ScenarioSettings) {
    const settings = validateScenario(input);
    if (months.length > 24) throw new Error('Scenario range exceeds 24 months');
    let cumulativeImpactInCents = BigInt(0);
    return months.map(month => {
        if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month.period)
            || month.incomeInCents < BigInt(0) || month.expenseInCents < BigInt(0)) {
            throw new Error('Invalid scenario month');
        }
        const simulatedIncomeInCents = adjustedCents(month.incomeInCents, settings.incomeChangePercent);
        const simulatedExpenseInCents = adjustedCents(month.expenseInCents, settings.expenseChangePercent);
        const simulatedBalanceInCents = simulatedIncomeInCents - simulatedExpenseInCents;
        const baselineBalanceInCents = month.incomeInCents - month.expenseInCents;
        const monthlyImpactInCents = simulatedBalanceInCents - baselineBalanceInCents;
        cumulativeImpactInCents += monthlyImpactInCents;
        return {
            period: month.period,
            baselineBalanceInCents,
            simulatedIncomeInCents,
            simulatedExpenseInCents,
            simulatedBalanceInCents,
            monthlyImpactInCents,
            cumulativeImpactInCents,
        };
    });
}
