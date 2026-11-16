'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

export function GoalMovementForm({ goalId }: { goalId: string }) {
    const router = useRouter();
    const [saving, setSaving] = useState(false);
    const [feedback, setFeedback] = useState('');

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = event.currentTarget;
        const data = new FormData(form);
        setSaving(true);
        setFeedback('');
        try {
            const response = await fetch(`/api/goals/${encodeURIComponent(goalId)}/movements`, {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: String(data.get('type')),
                    amountInCents: String(data.get('amountInCents')),
                }),
            });
            if (!response.ok) throw new Error('Não foi possível registrar a movimentação.');
            form.reset();
            setFeedback('Movimentação registrada.');
            router.refresh();
        } catch (error) {
            setFeedback(error instanceof Error ? error.message : 'Erro ao registrar.');
        } finally {
            setSaving(false);
        }
    }

    return (
        <form onSubmit={submit} className="finance-form">
            <label>Movimentação
                <select name="type" defaultValue="DEPOSIT">
                    <option value="DEPOSIT">Aporte</option>
                    <option value="WITHDRAWAL">Retirada</option>
                </select>
            </label>
            <label>Valor em centavos
                <input name="amountInCents" inputMode="numeric" pattern="[1-9][0-9]*" required />
            </label>
            <button type="submit" disabled={saving}>Registrar</button>
            <span role="status">{feedback}</span>
        </form>
    );
}
