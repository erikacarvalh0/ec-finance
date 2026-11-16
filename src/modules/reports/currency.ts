const formatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function formatReportCurrency(cents: bigint) {
    const whole = cents / BigInt(100);
    const fraction = cents % BigInt(100);
    const absoluteFraction = fraction < BigInt(0) ? -fraction : fraction;

    return formatter.formatToParts(cents < BigInt(0) && whole === BigInt(0) ? -0 : whole)
        .map((part) => part.type === 'fraction'
            ? absoluteFraction.toString().padStart(2, '0') : part.value)
        .join('');
}
