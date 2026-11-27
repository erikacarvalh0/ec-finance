'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ecds-v1/compat';
import styles from './expense-archive-button.module.css';

export function ExpenseArchiveButton({ id, archived }: { id: string; archived: boolean }) {
    const router = useRouter();
    const [confirming, setConfirming] = useState(false);
    const [saving, setSaving] = useState(false);
    const [feedback, setFeedback] = useState('');

    async function updateArchive() {
        setSaving(true);
        setFeedback('');

        try {
            const response = await fetch(`/api/expenses/${encodeURIComponent(id)}/archive`, {
                method: 'PATCH',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ archived: !archived }),
            });

            if (!response.ok) {
                const result = await response.json().catch(() => ({}));
                throw new Error(result.error ?? 'Não foi possível atualizar o arquivo.');
            }

            setConfirming(false);
            router.refresh();
        } catch (error) {
            setFeedback(error instanceof Error ? error.message : 'Falha ao atualizar.');
        } finally {
            setSaving(false);
        }
    }

    function requestConfirmation() {
        setConfirming(true);
    }

    function cancelConfirmation() {
        setConfirming(false);
    }

    return (
        <div className={styles['expense-archive']}>
            <hr className={styles['expense-archive__divider']} />
            {!confirming ? (
                <div className={styles['expense-archive__actions']}>
                    <Button type="button" variant="secondary" className={styles['expense-archive__trigger']} disabled={saving} onClick={requestConfirmation}>
                        {archived ? 'Restaurar' : 'Arquivar'}
                    </Button>
                </div>
            ) : (
                <div role="group" aria-label="Confirmar alteração de arquivamento">
                    <h3 className={styles['expense-archive__title']}>{archived ? 'Restaurar esta despesa?' : 'Arquivar esta despesa?'}</h3>
                    <div className={styles['expense-archive__actions']}>
                        <Button type="button" variant="secondary" className={styles['expense-archive__cancel']} disabled={saving} onClick={cancelConfirmation}>Cancelar</Button>
                        <Button type="button" disabled={saving} onClick={updateArchive}>Confirmar</Button>
                    </div>
                </div>
            )}
            <span role="status">{feedback}</span>
        </div>
    );
}
