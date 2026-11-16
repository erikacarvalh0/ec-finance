export interface MonthlyRecordedCashflow {
    period: string;
    incomeInCents: bigint;
    expenseInCents: bigint;
    netInCents: bigint;
}

export function summarizeAnnualCashflow(year: number, months: MonthlyRecordedCashflow[]) {
    if (!Number.isInteger(year) || year < 1000 || year > 9999) {
        throw new Error('Invalid reporting year');
    }

    const seen = new Set<string>();
    let incomeInCents = BigInt(0);
    let expenseInCents = BigInt(0);
    let netInCents = BigInt(0);
    let monthsWithRecords = 0;

    for (const month of months) {
        const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(month.period);
        if (!match || Number(match[1]) !== year || seen.has(month.period)) {
            throw new Error('Invalid or duplicate annual reporting period');
        }
        seen.add(month.period);
        incomeInCents += month.incomeInCents;
        expenseInCents += month.expenseInCents;
        netInCents += month.netInCents;
        if (month.incomeInCents !== BigInt(0) || month.expenseInCents !== BigInt(0)) {
            monthsWithRecords += 1;
        }
    }

    return { year, incomeInCents, expenseInCents, netInCents, monthsWithRecords };
}
