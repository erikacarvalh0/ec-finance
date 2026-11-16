export type InvoicePaymentStatus = 'OPEN' | 'CLOSED' | 'PARTIALLY_PAID' | 'PAID';

export interface InvoicePaymentSummary {
    status: InvoicePaymentStatus;
    totalInCents: bigint;
    paidInCents: bigint;
    balanceInCents: bigint;
}

export function summarizeInvoicePayments(
    invoice: { totalInCents: bigint; dueDate: Date; period: string },
    payments: Array<{ amountInCents: bigint }>,
    now: Date,
    closingDate: Date,
): InvoicePaymentSummary {
    const paidInCents = payments.reduce(
        (sum, payment) => sum + payment.amountInCents,
        BigInt(0),
    );

    if (paidInCents < BigInt(0) || paidInCents > invoice.totalInCents) {
        throw new Error('Payments exceed invoice total');
    }

    const balanceInCents = invoice.totalInCents - paidInCents;
    let status: InvoicePaymentStatus = 'OPEN';

    if (paidInCents > BigInt(0) && balanceInCents === BigInt(0)) {
        status = 'PAID';
    } else if (paidInCents > BigInt(0)) {
        status = 'PARTIALLY_PAID';
    } else if (now.getTime() >= closingDate.getTime()) {
        status = 'CLOSED';
    }

    return {
        status,
        totalInCents: invoice.totalInCents,
        paidInCents,
        balanceInCents,
    };
}
