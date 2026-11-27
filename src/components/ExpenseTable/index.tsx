'use client';

import type { ReactNode } from 'react';
import { Table } from '@erikacarvalho/react/Table';

import styles from './index.module.css';

const badgeVariants: Record<string, string> = {
    'Alimentação': 'food',
    'Moradia': 'home',
    'Transporte': 'transport',
    'Pago': 'paid',
    'Paga': 'paid',
    'Pendente': 'pending',
};

function badge(value: string) {
    const variant = badgeVariants[value];
    return <span className={[styles['expense-table__badge'], variant && styles['expense-table__badge--' + variant]].filter(Boolean).join(' ')}>{value}</span>;
}

export type ExpenseTableRow = {
    id: string;
    date: string;
    description: string;
    category: string;
    paymentMethod: string;
    installments: string;
    amount: string;
    status: string;
    actions: ReactNode;
};

export function ExpenseTable({ rows }: { rows: ExpenseTableRow[] }) {
    if (!rows.length) {
        return <p>Nenhuma despesa registrada.</p>;
    }

    return (
        <div className={styles['expense-table']}>
        <Table paginationConfig={{ itemsPerPage: 20, arrows: true }} data={rows.map(row => ({
            date: row.date,
            description: row.description,
            category: badge(row.category),
            paymentMethod: row.paymentMethod,
            installments: row.installments,
            amount: row.amount,
            status: badge(row.status),
            actions: <div key={row.id}>{row.actions}</div>,
        }))}>
            <th scope="col">Data</th>
            <th scope="col">Descrição</th>
            <th scope="col">Categoria</th>
            <th scope="col">Forma de pagamento</th>
            <th scope="col">Parcelas</th>
            <th scope="col">Valor</th>
            <th scope="col">Status</th>
            <th scope="col">Ações</th>
        </Table>
        </div>
    );
}
