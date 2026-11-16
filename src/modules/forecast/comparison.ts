import { simulateCashflow, type ScenarioMonth, type ScenarioSettings } from './scenarios';

/** Compare two assumption sets over exactly the same recorded baseline months. */
export function compareCashflowScenarios(
    months: ScenarioMonth[],
    first: ScenarioSettings,
    second: ScenarioSettings,
) {
    const firstResult = simulateCashflow(months, first);
    const secondResult = simulateCashflow(months, second);
    return firstResult.map((month, index) => ({
        period: month.period,
        baselineBalanceInCents: month.baselineBalanceInCents,
        firstBalanceInCents: month.simulatedBalanceInCents,
        secondBalanceInCents: secondResult[index].simulatedBalanceInCents,
        differenceInCents: secondResult[index].simulatedBalanceInCents
            - month.simulatedBalanceInCents,
    }));
}
