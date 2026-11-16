type InvoiceAdjustmentLine = {
    source: 'IMPORTED' | 'MANUAL';
    amountInCents: bigint;
};

/**
 * Imported negative transactions are credits or refunds, not additional charges.
 * The sign is preserved in the existing invoice total and payment calculations.
 */
export function summarizeInvoiceAdjustments(lines: InvoiceAdjustmentLine[]) {
    let chargesInCents = BigInt(0);
    let creditsInCents = BigInt(0);
    let creditCount = 0;

    for (const line of lines) {
        if (line.amountInCents < BigInt(0)) {
            if (line.source !== 'IMPORTED') {
                throw new Error('Negative manual invoice amount is unsupported');
            }
            creditsInCents -= line.amountInCents;
            creditCount += 1;
        } else {
            chargesInCents += line.amountInCents;
        }
    }

    return {
        chargesInCents,
        creditsInCents,
        netInCents: chargesInCents - creditsInCents,
        creditCount,
    };
}
