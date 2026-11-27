'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
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
    const triggerRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ top: 0, left: 0 });

    useEffect(() => {
        if (!open) return;

        function updatePosition() {
            const anchor = triggerRef.current?.getBoundingClientRect();
            const menu = menuRef.current?.getBoundingClientRect();
            if (!anchor || !menu) return;
            const below = window.innerHeight - anchor.bottom;
            const top = below >= menu.height + 8 || below >= anchor.top
                ? anchor.bottom + 4
                : anchor.top - menu.height - 4;
            setPosition({
                top: Math.max(8, Math.min(top, window.innerHeight - menu.height - 8)),
                left: Math.max(8, Math.min(anchor.right - menu.width, window.innerWidth - menu.width - 8)),
            });
        }

        function handleOutside(event: PointerEvent) {
            const target = event.target;
            if (target instanceof Node && !triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) {
                setOpen(false);
            }
        }

        updatePosition();
        menuRef.current?.querySelector('button')?.focus();
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition, true);
        document.addEventListener('pointerdown', handleOutside);
        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
            document.removeEventListener('pointerdown', handleOutside);
        };
    }, [open]);
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
            triggerRef.current?.querySelector('button')?.focus();
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
        <div ref={triggerRef} className={styles['expense-actions']} onKeyDown={handleKeyDown}>
            <Button variant="ghost" type="button" aria-label={`Ações de ${description}`} aria-expanded={open} onClick={handleToggle}>
                …
            </Button>
            {open && createPortal(
                <div ref={menuRef} className={styles['expense-actions__menu']} style={position}>
                    {actions.filter(([action]) => handlers[action]).map(([action, label]) => (
                        <Button variant="ghost" className={styles['expense-actions__item']} key={action} type="button" onClick={() => handleAction(action)}>
                            {label}
                        </Button>
                    ))}
                </div>,
                document.body,
            )}
        </div>
    );
}
