'use client';

import { useState } from 'react';
import { Button } from '@/components/ecds-v1/compat';
import styles from './index.module.css';

export type ExpenseAction = 'details' | 'edit' | 'pay' | 'reopen' | 'installments' | 'duplicate' | 'archive' | 'restore' | 'delete';

export function ExpenseActions({
    description,
    archived,
    paid,
    installments,
    handlers,
}: {
    description: string;
    archived: boolean;
    paid: boolean;
    installments: number;
    handlers: Partial<Record<ExpenseAction, () => void>>;
}) {
    const [open, setOpen] = useState(false);
    const actions: Array<[ExpenseAction, string]> = [
        ['details', 'Ver detalhes'],
        ...(!archived ? [
            ['edit', 'Editar despesa'],
            paid ? ['reopen', 'Marcar como pendente'] : ['pay', 'Marcar como paga'],
        ] as Array<[ExpenseAction, string]> : []),
        ...(installments > 1 ? [['installments', 'Visualizar parcelas']] as Array<[ExpenseAction, string]> : []),
        ...(archived ? [
            ['restore', 'Restaurar despesa'],
            ['delete', 'Excluir permanentemente'],
        ] : [
            ['duplicate', 'Duplicar despesa'],
            ['archive', 'Arquivar despesa'],
        ]) as Array<[ExpenseAction, string]>,
    ];

    return (
        <div className={styles.container} onKeyDown={(event) => {
            if (event.key === 'Escape') {
                setOpen(false);
                event.currentTarget.querySelector('button')?.focus();
            }
        }}>
            <Button type="button" aria-label={`Ações de ${description}`} aria-expanded={open} onClick={() => setOpen(!open)}>
                …
            </Button>
            {open && (
                <div className={styles.actions}>
                    {actions.filter(([action]) => handlers[action]).map(([action, label]) => (
                        <Button key={action} type="button" onClick={() => {
                            setOpen(false);
                            handlers[action]?.();
                        }}>
                            {label}
                        </Button>
                    ))}
                </div>
            )}
        </div>
    );
}
