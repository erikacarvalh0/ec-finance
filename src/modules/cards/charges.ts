import { getInvoiceDueDate, getInvoicePeriod } from './invoice';

interface InvoiceChargeInput {
    period: string;
    closingDay: number;
    dueDay: number;
    totalInCents: bigint;
    dailyInterestBasisPoints: bigint;
    lateFineBasisPoints: bigint;
    lateFeeInCents: bigint;
    credits: Array<{ amountInCents: bigint; occurredAt: Date }>;
    asOf: Date;
}

const dayInMilliseconds = 86400000;
const basisPoints = BigInt(10000);

function utcDay(date: Date): number {
    if (Number.isNaN(date.getTime())) throw new Error('Invalid charge date');
    return Math.floor(date.getTime() / dayInMilliseconds);
}

function roundBasisPoints(amount: bigint, rate: bigint): bigint {
    return (amount * rate + basisPoints / BigInt(2)) / basisPoints;
}

/** Estimate only: explicit rates, simple daily interest and one-time late charges. */
export function calculateInvoiceCharges(input: InvoiceChargeInput) {
    const dueDate = getInvoiceDueDate(input.period, input.closingDay, input.dueDay);
    const asOfDay = utcDay(input.asOf);
    const firstLateDay = utcDay(dueDate) + 1;
    if (input.dailyInterestBasisPoints < BigInt(0)
        || input.lateFineBasisPoints < BigInt(0)
        || input.lateFeeInCents < BigInt(0)) {
        throw new Error('Charge rates and fees must be nonnegative');
    }

    const credits = input.credits.map((credit) => {
        if (credit.amountInCents <= BigInt(0)) {
            throw new Error('Invoice credits must be positive');
        }
        return { day: utcDay(credit.occurredAt), amountInCents: credit.amountInCents };
    }).filter((credit) => credit.day <= asOfDay).sort((a, b) => a.day - b.day);

    let principal = input.totalInCents;
    let cursor = firstLateDay;
    let principalDays = BigInt(0);
    let fineBase = BigInt(0);
    let fineBaseRecorded = false;

    // Accrue by intervals rather than iterating over every overdue calendar day.
    const accrueUntil = (end: number) => {
        if (end <= cursor) return;
        if (principal > BigInt(0)) {
            principalDays += principal * BigInt(end - cursor);
            if (!fineBaseRecorded) fineBase = principal;
        }
        fineBaseRecorded = true;
        cursor = end;
    };

    for (const credit of credits) {
        accrueUntil(credit.day);
        principal -= credit.amountInCents;
    }
    accrueUntil(asOfDay + 1);

    const interestInCents = roundBasisPoints(principalDays, input.dailyInterestBasisPoints);
    const fineInCents = roundBasisPoints(fineBase, input.lateFineBasisPoints);
    const feeInCents = fineBase > BigInt(0) ? input.lateFeeInCents : BigInt(0);
    const chargesInCents = interestInCents + fineInCents + feeInCents;
    const balance = principal + chargesInCents;

    return {
        isClosed: getInvoicePeriod(input.asOf, input.closingDay) > input.period,
        dueDate,
        overdueDays: Math.max(0, asOfDay - firstLateDay + 1),
        interestInCents,
        fineInCents,
        feeInCents,
        chargesInCents,
        balanceInCents: balance > BigInt(0) ? balance : BigInt(0),
    };
}
