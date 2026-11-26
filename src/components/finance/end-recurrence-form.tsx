'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input } from '@/components/ecds-v1/compat';

export function EndRecurrenceForm({
    kind,
    id,
    currentDate,
}: {
    kind: 'expense' | 'income';
    id: string;
    currentDate: string;
}) {
    const router = useRouter();
    const [feedback, setFeedback] = useState('');
    const [saving, setSaving] = useState(false);

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const values = new FormData(event.currentTarget);
        const endsOn = String(values.get('endsOn') ?? '');
        setSaving(true);
        setFeedback('');

        try {
            const response = await fetch(
                `/api/recurrences/${kind}/${encodeURIComponent(id)}/end`,
                {
                    method: 'PATCH',
                    credentials: 'same-origin',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ endsOn }),
                },
            );

            if (!response.ok) {
                const result = await response.json().catch(() => ({}));
                throw new Error(result.error ?? 'Não foi possível encerrar.');
            }

            setFeedback('Recorrência encerrada.');
            router.refresh();
        } catch (error) {
            setFeedback(error instanceof Error ? error.message : 'Erro ao encerrar.');
        } finally {
            setSaving(false);
        }
    }

    return (
        <form onSubmit={submit} className="recurrence-end-form">
            <label>
                Encerrar recorrência em
                <Input
                    name="endsOn"
                    type="date"
                    defaultValue={currentDate}
                    required
                />
            </label>
            <Button type="submit" size="sm" disabled={saving}>
                Encerrar
            </Button>
            <span role="status">{feedback}</span>
        </form>
    );
}
