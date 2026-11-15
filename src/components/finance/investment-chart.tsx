type Valuation = {
    amountInCents: bigint;
    recordedAt: Date;
    id: string;
};

const formatCurrency = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
});

export function InvestmentChart({
    name,
    snapshots,
}: {
    name: string;
    snapshots: Valuation[];
}) {
    const ordered = [...snapshots].sort((left, right) => (
        left.recordedAt.getTime() - right.recordedAt.getTime()
    ));

    if (ordered.length === 0) {
        return <p>Registre o primeiro saldo para visualizar a evolução.</p>;
    }

    const values = ordered.map((item) => Number(item.amountInCents));
    const min = Math.min(...values);
    const max = Math.max(...values);
    const spread = Math.max(max - min, 1);
    const points = ordered.map((item, index) => ({
        x: ordered.length === 1 ? 150 : 16 + index * 268 / (ordered.length - 1),
        y: 105 - (values[index] - min) / spread * 85,
        amount: item.amountInCents,
        id: item.id,
    }));
    const line = points.map((point) => `${point.x},${point.y}`).join(' ');

    return (
        <div>
            <svg
                viewBox="0 0 300 125"
                role="img"
                aria-label={`Evolução do investimento ${name}`}
                className="investment-chart"
            >
                <line x1="16" x2="284" y1="105" y2="105" stroke="currentColor" opacity="0.2" />
                {points.length > 1 && (
                    <polyline
                        points={line}
                        fill="none"
                        stroke="#7656d6"
                        strokeWidth="3"
                        strokeLinejoin="round"
                    />
                )}
                {points.map((point) => (
                    <circle
                        key={point.id}
                        cx={point.x}
                        cy={point.y}
                        r="4"
                        fill="#7656d6"
                    />
                ))}
            </svg>
            <p>
                Último saldo: {formatCurrency.format(Number(
                    ordered[ordered.length - 1].amountInCents,
                ) / 100)}
            </p>
            <ul className="valuation-history">
                {ordered.map((snapshot) => (
                    <li key={snapshot.id}>
                        {snapshot.recordedAt.toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                        {' — '}
                        {formatCurrency.format(Number(snapshot.amountInCents) / 100)}
                    </li>
                ))}
            </ul>
        </div>
    );
}
