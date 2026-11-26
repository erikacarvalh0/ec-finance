import { getExpenseInstallments, type InstallmentOccurrence } from './utils';

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

function formatAmount(amount: bigint) {
    return currency.format(Number(amount) / 100);
}

const labels = { PENDING: 'Pendente', SETTLED: 'Paga', CANCELED: 'Cancelada' };

export function ExpenseInstallments({ expense, occurrences }: {
    expense: Parameters<typeof getExpenseInstallments>[0];
    occurrences: InstallmentOccurrence[];
}) {
    const rows = getExpenseInstallments(expense, occurrences);
    const paid = rows.reduce((sum, row) => sum + (row.status === 'SETTLED' ? row.actualAmountInCents : BigInt(0)), BigInt(0));
    const pending = rows.reduce((sum, row) => sum + (row.status === 'PENDING' ? row.amountInCents : BigInt(0)), BigInt(0));

    return (
        <section aria-label="Parcelas da despesa">
            <p>Total: {formatAmount(BigInt(expense.amountInCents))}</p>
            <p>Pago: {formatAmount(paid)}</p>
            <p>Pendente: {formatAmount(pending)}</p>
            <table>
                <thead><tr><th>Parcela</th><th>Vencimento</th><th>Valor previsto</th><th>Status</th></tr></thead>
                <tbody>
                    {rows.map(row => (
                        <tr key={row.number}>
                            <td>{row.number}/{expense.installments}</td>
                            <td>{row.date.split('-').reverse().join('/')}</td>
                            <td>{formatAmount(row.amountInCents)}</td>
                            <td>{labels[row.status]}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </section>
    );
}
