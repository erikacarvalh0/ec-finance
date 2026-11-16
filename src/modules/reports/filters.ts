export interface ReportMonthFilter {
    from?: string;
    to?: string;
}

export function parseReportMonthRange(
    filter: ReportMonthFilter,
    now: Date = new Date(),
) {
    const current = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const lastPeriod = filter.to ?? `${current.getUTCFullYear()}-${String(current.getUTCMonth() + 1).padStart(2, '0')}`;
    const fromPeriod = filter.from ?? (() => {
        const start = new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() - 5, 1));
        return `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, '0')}`;
    })();
    if ((filter.from === undefined) !== (filter.to === undefined)
        || !/^\d{4}-(0[1-9]|1[0-2])$/.test(fromPeriod)
        || !/^\d{4}-(0[1-9]|1[0-2])$/.test(lastPeriod)) {
        throw new Error('Invalid reporting month range');
    }
    const [fromYear, fromMonth] = fromPeriod.split('-').map(Number);
    const [toYear, toMonth] = lastPeriod.split('-').map(Number);
    const count = (toYear - fromYear) * 12 + toMonth - fromMonth + 1;
    if (count < 1 || count > 12 || fromYear < 1000 || toYear > 9999) {
        throw new Error('Invalid reporting month range');
    }
    return { from: new Date(Date.UTC(fromYear, fromMonth - 1, 1)), count, lastPeriod };
}
