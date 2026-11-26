'use client';

import { useState, type KeyboardEvent } from 'react';
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

    function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
        if (event.key === 'Escape') {
            setOpen(false);
            event.currentTarget.querySelector('button')?.focus();
        }
    }

    function handleToggle() {
        setOpen(previous => !previous);
    }

    function handleAction(action: ExpenseAction) {
        setOpen(false);
        handlers[action]?.();
    }

    return (
        <div className={styles.container} onKeyDown={handleKeyDown}>
            <Button type="button" aria-label={`Ações de ${description}`} aria-expanded={open} onClick={handleToggle}>
                …
            </Button>
            {open && (
                <div className={styles.actions}>
                    {actions.filter(([action]) => handlers[action]).map(([action, label]) => (
                        <Button key={action} type="button" onClick={() => handleAction(action)}>
                            {label}
                        </Button>
                    ))}
                </div>
            )}
        </div>
    );
}
