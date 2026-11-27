import type { ReactNode } from 'react';
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

export function ExpenseDetails({ expense, children, footer }: { expense: ExpenseDetailsData; children?: ReactNode; footer?: ReactNode }) {
    const fields = [
        ['Tipo', expense.type],
        ['Categoria', expense.category],
        ['Forma de pagamento', expense.paymentMethod],
        ['Data', expense.date],
        ['Parcelas', expense.installments],
        ['Status', expense.status],
    ];

    return (
        <section className={styles['expense-details']}>
            <h3>{expense.description}</h3>
            <strong className={styles['expense-details__amount']}>{expense.amount}</strong>
            <dl className={styles['expense-details__fields']}>
                {fields.map(([label, value]) => (
                    <div key={label}>
                        <dt>{label}</dt>
                        <dd>{value}</dd>
                    </div>
                ))}
            </dl>
            {children}
            {footer && <footer className={styles['expense-details__footer']}>{footer}</footer>}
        </section>
    );
}
