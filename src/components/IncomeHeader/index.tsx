'use client';

import { useEffect, useRef, useState } from 'react';
import { IncomeForm } from '@/components/finance/forms';
import { Button } from '@/components/ecds-v1/compat';
import styles from './index.module.css';

export function IncomeHeader({ categories }: {
    categories: Array<{ id: string; name: string }>;
}) {
    const [open, setOpen] = useState(false);

    const dialog = useRef<HTMLDialogElement>(null);
    useEffect(() => {
        if (open && dialog.current && !dialog.current.open) {
            dialog.current.showModal();
            dialog.current.querySelector<HTMLInputElement>('[name="description"]')?.focus();
        }
    }, [open]);
    const dirty = useRef(false);
    const trigger = useRef<HTMLButtonElement | null>(null);

    function closeDialog() {
        dirty.current = false;
        dialog.current?.close();
        setOpen(false);
        requestAnimationFrame(() => trigger.current?.focus());
    }

    function requestClose() {
        if (!dirty.current || window.confirm('Descartar alterações não salvas?')) closeDialog();
    }

    function keepKeyboardFocus(event: React.KeyboardEvent<HTMLDialogElement>) {
        if (event.key !== 'Tab') return;
        const controls = Array.from(dialog.current?.querySelectorAll<HTMLElement>(
            'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
        ) ?? []).filter(element => element.getClientRects().length > 0);
        if (controls.length === 0) return;
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    }

    return (
        <header className={styles['income-header']}>
            <div>
                <h1>Entradas</h1>
                <p>Registre e acompanhe todas as suas receitas.</p>
            </div>
            <Button type="button" outline className={styles['income-header__action']} onClick={event => { trigger.current = event.currentTarget; setOpen(true); }} icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M12 5v14M5 12h14" />
                </svg>}>Nova entrada</Button>
            {open && (
                <dialog ref={dialog} className={styles['income-dialog']} aria-labelledby="income-dialog-title" aria-describedby="income-dialog-description" onKeyDown={keepKeyboardFocus} onCancel={event => { event.preventDefault(); requestClose(); }}>
                    <header className={styles['income-dialog__header']}>
                        <span className={styles['income-dialog__icon']} aria-hidden="true">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M12 8v8m-4-4h8"/></svg>
                        </span>
                        <h2 id="income-dialog-title">Nova entrada</h2>
                        <Button variant="ghost" type="button" aria-label="Fechar" onClick={requestClose}>×</Button>
                    </header>
                    <IncomeForm categories={categories} onSuccess={closeDialog} onCancel={requestClose} onDirty={() => { dirty.current = true; }} />
                </dialog>
            )}
        </header>
    );
}
