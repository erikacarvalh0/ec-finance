'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input } from '@/components/ecds-v1/compat';

export function FinancialGoalForm() {
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
            const response = await fetch('/api/goals', {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: String(data.get('name') ?? ''),
                    targetInCents: String(data.get('targetInCents') ?? ''),
                    savedInCents: String(data.get('savedInCents') ?? ''),
                    ...(data.get('deadline') ? { deadline: String(data.get('deadline')) } : {}),
                }),
            });
            if (!response.ok) {
                throw new Error('Não foi possível cadastrar a meta.');
            }
            form.reset();
            setFeedback('Meta cadastrada.');
            router.refresh();
        } catch (error) {
            setFeedback(error instanceof Error ? error.message : 'Erro ao salvar.');
        } finally {
            setSaving(false);
        }
    }

    return (
        <form onSubmit={submit} className="finance-form">
            <label>Nome da meta<Input name="name" maxLength={100} required /></label>
            <label>Valor-alvo (centavos)<Input name="targetInCents" inputMode="numeric" pattern="[0-9]+" required /></label>
            <label>Valor já reservado (centavos)<Input name="savedInCents" inputMode="numeric" pattern="[0-9]+" defaultValue="0" required /></label>
            <label>Prazo opcional<Input name="deadline" type="date" /></label>
            <Button type="submit" disabled={saving}>Criar meta</Button>
            <span role="status">{feedback}</span>
        </form>
    );
}
