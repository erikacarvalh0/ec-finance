import styles from './index.module.css';

export type ExpenseDetailsData = {
    description: string;
    amount: string;
    type: string;
    category: string;
    paymentMethod: string;
    date: string;
    installments: string;
    status: string;
};

export function ExpenseDetails({ expense }: { expense: ExpenseDetailsData }) {
    const fields = [
        ['Tipo', expense.type],
        ['Categoria', expense.category],
        ['Forma de pagamento', expense.paymentMethod],
        ['Data', expense.date],
        ['Parcelas', expense.installments],
        ['Status', expense.status],
    ];

    return (
        <section>
            <h3>{expense.description}</h3>
            <strong>{expense.amount}</strong>
            <dl className={styles.fields}>
                {fields.map(([label, value]) => (
                    <div key={label}>
                        <dt>{label}</dt>
                        <dd>{value}</dd>
                    </div>
                ))}
            </dl>
        </section>
    );
}
