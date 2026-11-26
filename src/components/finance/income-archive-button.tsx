'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ecds-v1/compat';

export function IncomeArchiveButton({ id, archived }: { id: string; archived: boolean }) {
    const router = useRouter();
    const [saving, setSaving] = useState(false);
    const [feedback, setFeedback] = useState('');

    async function updateArchive() {
        setSaving(true);
        setFeedback('');

        try {
            const response = await fetch(`/api/incomes/${encodeURIComponent(id)}/archive`, {
                method: 'PATCH',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ archived: !archived }),
            });

            if (!response.ok) {
                const result = await response.json().catch(() => ({}));
                throw new Error(result.error ?? 'Não foi possível atualizar o arquivo.');
            }

            router.refresh();
        } catch (error) {
            setFeedback(error instanceof Error ? error.message : 'Falha ao atualizar.');
        } finally {
            setSaving(false);
        }
    }

    return (
        <div>
            <Button type="button" size="sm" disabled={saving} onClick={updateArchive}>
                {archived ? 'Restaurar' : 'Arquivar'}
            </Button>
            <span role="status">{feedback}</span>
        </div>
    );
}
