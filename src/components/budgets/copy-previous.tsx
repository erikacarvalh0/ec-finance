'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@erikacarvalho/react';

export function CopyPreviousMonthBudgets({ targetPeriod }: { targetPeriod: string }) {
    const router = useRouter();
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    async function copy() {
        setSaving(true);
        setMessage('');
        try {
            const response = await fetch('/api/budgets/copy-previous', {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetPeriod }),
            });
            if (!response.ok) throw new Error('Não foi possível copiar os orçamentos.');
            const result: { copied: number; found: number } = await response.json();
            setMessage(`${result.copied} orçamento(s) copiado(s). Limites já configurados foram preservados.`);
            router.refresh();
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Erro ao copiar orçamentos.');
        } finally {
            setSaving(false);
        }
    }

    return (
        <div>
            <Button type="button" onClick={copy} disabled={saving}>
                Copiar limites do mês anterior
            </Button>
            <p role="status">{message}</p>
        </div>
    );
}
