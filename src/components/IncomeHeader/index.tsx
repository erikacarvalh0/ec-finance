'use client';

import { useRef, useState } from 'react';
import { Dialog } from '@erikacarvalho/react/Dialog';
import { IncomeForm } from '@/components/finance/forms';
import styles from './index.module.css';

export function IncomeHeader({ categories }: {
    categories: Array<{ id: string; name: string }>;
}) {
    const [open, setOpen] = useState(false);

    const dirty = useRef(false);
    const trigger = useRef<HTMLButtonElement>(null);

    function closeDialog() {
        dirty.current = false;
        setOpen(false);
        requestAnimationFrame(() => trigger.current?.focus());
    }

    function requestClose() {
        if (!dirty.current || window.confirm('Descartar alterações não salvas?')) closeDialog();
    }

    return (
        <header className={styles['income-header']}>
            <div>
                <h1>Entradas</h1>
                <p>Registre e acompanhe todas as suas receitas.</p>
            </div>
            <button
                type="button"
                ref={trigger}
                className={styles['income-header__action']}
                onClick={() => setOpen(true)}
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M12 5v14M5 12h14" />
                </svg>
                Nova entrada
            </button>
            {open && (
                <Dialog isOpen toggleDialog={requestClose} title="Nova entrada">
                    <IncomeForm categories={categories} onSuccess={closeDialog} onCancel={requestClose} onDirty={() => { dirty.current = true; }} />
                </Dialog>
            )}
        </header>
    );
}
