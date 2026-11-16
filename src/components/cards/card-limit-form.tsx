'use client';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input } from '@erikacarvalho/react';

export function CardLimitForm({
    cardId,
    currentLimit,
}: {
    cardId: string;
    currentLimit: string | null;
}) {
    const router = useRouter();
    const [busy, setBusy] = useState(false);
    const [feedback, setFeedback] = useState('');

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const values = new FormData(event.currentTarget);
        const raw = String(values.get('amount') ?? '').trim();
        const match = /^(\d+)(?:[.,](\d{1,2}))?$/.exec(raw);
        if (!match) {
            setFeedback('Informe um valor válido com até duas casas decimais.');
            return;
        }
        const amountInCents = BigInt(match[1]) * BigInt(100)
            + BigInt((match[2] ?? '').padEnd(2, '0') || '0');
        if (amountInCents <= BigInt(0)) {
            setFeedback('O limite deve ser maior que zero.');
            return;
        }
        setBusy(true);
        setFeedback('');
        try {
            const response = await fetch(`/api/cards/${encodeURIComponent(cardId)}/limit`, {
                method: 'PATCH',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ creditLimitInCents: amountInCents.toString() }),
            });
            if (!response.ok) throw new Error('Não foi possível salvar o limite.');
            setFeedback('Limite atualizado.');
            router.refresh();
        } catch (error) {
            setFeedback(error instanceof Error ? error.message : 'Erro ao salvar.');
        } finally {
            setBusy(false);
        }
    }

    return (
        <form className="finance-form" onSubmit={submit}>
            <label>
                Limite informado do cartão (R$)
                <Input name="amount" inputMode="decimal"
                    defaultValue={currentLimit ? (Number(currentLimit) / 100).toFixed(2) : ''}
                    required />
            </label>
            <Button size="sm" type="submit" disabled={busy}>Salvar limite</Button>
            <span role="status">{feedback}</span>
        </form>
    );
}
