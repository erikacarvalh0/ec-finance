import type { MonthlyRecordedCashflow } from './annual';

/** Dashboard values are exclusively sourced from owner-scoped recorded cashflow. */
export function summarizeDashboardRecordedCashflow(months: MonthlyRecordedCashflow[]) {
    if (months.length !== 1) {
        throw new Error('Exactly one reporting month is required');
    }
    const month = months[0];
    return {
        ...month,
        hasRecords: month.incomeInCents !== 0n || month.expenseInCents !== 0n,
    };
}
