'use client';
import { useRef, useState, useEffect, useId } from 'react';
import { useRouter } from 'next/navigation';
import { RecordEditForm } from '@/components/finance/record-edit-form';
import { EndRecurrenceForm } from '@/components/finance/end-recurrence-form';
import styles from './index.module.css';

type Record = Extract<Parameters<typeof RecordEditForm>[0]['record'], { kind: 'income' }>;
type Action = 'edit' | 'archive' | 'end';
export function IncomeActions({ record, categories, archived }: { record: Record; categories: Array<{id: string; name: string}>; archived: boolean }) {
    const router = useRouter();
    const dialog = useRef<HTMLDialogElement>(null);
    const trigger = useRef<HTMLButtonElement | null>(null);
    const [action, setAction] = useState<Action | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const titleId = useId();
    useEffect(() => { if (action && !dialog.current?.open) dialog.current?.showModal(); }, [action]);
    function close() {
        dialog.current?.close();
        setAction(null);
        setError('');
        trigger.current?.focus();
    }
    async function archive() {
        if (saving) return;
        setSaving(true);
        setError('');
        try {
            const response = await fetch('/api/incomes/' + encodeURIComponent(record.id) + '/archive', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ archived: !archived }) });
            if (!response.ok) throw new Error('Não foi possível atualizar a entrada.');
            close();
            router.refresh();
        } catch (e) { setError(e instanceof Error ? e.message : 'Falha ao atualizar.'); }
        finally { setSaving(false); }
    }
    const buttons: Array<{ action: Action; label: string; path: string }> = [
        ...(!archived ? [{ action: 'edit' as const, label: 'Editar', path: 'M4 16v4h4L20 8l-4-4L4 16z M14 6l4 4' }] : []),
        ...(record.type === 'RECURRING' && !archived ? [{ action: 'end' as const, label: 'Encerrar recorrência', path: 'M5 5h14v14H5z M8 12h8' }] : []),
        { action: 'archive', label: archived ? 'Restaurar' : 'Arquivar', path: archived ? 'M4 10h16v10H4z M12 15V3 M8 7l4-4 4 4' : 'M3 4h18v5H3z M5 9v11h14V9 M9 13h6' },
    ];
    return <div className={styles.actions}>
        {buttons.map(button => <button key={button.action} type="button" aria-label={button.label + ' ' + (record.description || 'entrada')} title={button.label} onClick={event => { trigger.current = event.currentTarget; setAction(button.action); }}><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d={button.path}/></svg></button>)}
        {action && <dialog ref={dialog} aria-labelledby={titleId} className={styles.dialog} onCancel={event => { event.preventDefault(); if (!saving) close(); }}>
            <header><h2 id={titleId}>{action === 'edit' ? 'Editar entrada' : action === 'end' ? 'Encerrar recorrência' : archived ? 'Restaurar entrada?' : 'Arquivar entrada?'}</h2><button type="button" aria-label="Fechar" disabled={saving} onClick={close}>×</button></header>
            {action === 'edit' && <RecordEditForm inline record={record} categories={categories} onSuccess={close}/>}
            {action === 'end' && <EndRecurrenceForm kind="income" id={record.id} currentDate={record.endsOn}/>}
            {action === 'archive' && <><p>{record.description || 'Entrada'} — {archived ? 'voltará ao histórico ativo.' : 'será movida para as entradas arquivadas.'}</p><p role="alert">{error}</p><footer><button type="button" disabled={saving} onClick={close}>Cancelar</button><button type="button" disabled={saving} onClick={archive}>{saving ? 'Salvando…' : 'Confirmar'}</button></footer></>}
        </dialog>}
    </div>;
}
