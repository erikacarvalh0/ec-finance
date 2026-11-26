'use client';

import type { ReactNode } from 'react';
import { Table } from '@erikacarvalho/react/Table';

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
        <Table data={rows.map(({ id, ...row }) => ({
            ...row,
            actions: <div key={id}>{row.actions}</div>,
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
    );
}
