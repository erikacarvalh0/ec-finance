'use client';

import { useState } from 'react';
import { Dialog } from '@erikacarvalho/react/Dialog';
import { IncomeForm } from '@/components/finance/forms';
import styles from './index.module.css';

export function IncomeHeader({ categories }: {
    categories: Array<{ id: string; name: string }>;
}) {
    const [open, setOpen] = useState(false);

    function closeDialog() {
        setOpen(false);
    }

    return (
        <header className={styles['income-header']}>
            <div>
                <h1>Entradas</h1>
                <p>Registre e acompanhe todas as suas receitas.</p>
            </div>
            <button
                type="button"
                className={styles['income-header__action']}
                onClick={() => setOpen(true)}
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M12 5v14M5 12h14" />
                </svg>
                Nova entrada
            </button>
            {open && (
                <Dialog isOpen toggleDialog={closeDialog} title="Nova entrada">
                    <IncomeForm categories={categories} onSuccess={closeDialog} />
                </Dialog>
            )}
        </header>
    );
}
