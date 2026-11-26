'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ecds-v1/compat';

export function ExpenseDelete({ id, description, onClose }: { id: string; description: string; onClose: () => void }) {
    const router = useRouter();
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const pending = useRef(false);
    async function confirmDelete() {
        if (pending.current) return;
        pending.current = true;
        setSaving(true);
        setMessage('');
        try {
            const response = await fetch('/api/expenses/' + encodeURIComponent(id), { method: 'DELETE', credentials: 'same-origin' });
            if (!response.ok) {
                const body = await response.json().catch(() => ({}));
                throw new Error(body.error ?? 'Não foi possível excluir.');
            }
            router.refresh();
            onClose();
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Não foi possível excluir.');
        } finally {
            pending.current = false;
            setSaving(false);
        }
    }
    return <section>
        <p>Excluir permanentemente a despesa {description}? Esta ação não pode ser desfeita.</p>
        <Button type="button" disabled={saving} onClick={onClose}>Cancelar</Button>
        <Button type="button" disabled={saving} onClick={confirmDelete}>Excluir permanentemente</Button>
        <p role="status">{message}</p>
    </section>;
}
