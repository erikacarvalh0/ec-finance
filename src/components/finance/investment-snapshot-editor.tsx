'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Button, Input } from '@erikacarvalho/react';

function parseCents(value: string) {
    const match = /^(\d+)(?:[.,](\d{1,2}))?$/.exec(value.trim());

    if (!match) throw new Error('Informe um valor válido.');

    return (
        BigInt(match[1]) * BigInt(100)
        + BigInt((match[2] ?? '').padEnd(2, '0') || '0')
    ).toString();
}

export function InvestmentSnapshotEditor({
    investmentId,
    snapshot,
}: {
    investmentId: string;
    snapshot: { id: string; amountInCents: string; recordedAt: string };
}) {
    const router = useRouter();
    const [editing, setEditing] = useState(false);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');
    const endpoint = `/api/investments/${encodeURIComponent(investmentId)}/snapshots/${encodeURIComponent(snapshot.id)}`;

    async function save(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = event.currentTarget;
        const values = new FormData(form);
        setBusy(true);
        setMessage('');

        try {
            const response = await fetch(endpoint, {
                method: 'PATCH',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amountInCents: parseCents(String(values.get('amount'))),
                    recordedAt: String(values.get('date')),
                }),
            });

            if (!response.ok) {
                throw new Error('Não foi possível corrigir o valor.');
            }

            setEditing(false);
            setMessage('Atualização corrigida.');
            router.refresh();
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Erro inesperado.');
        } finally {
            setBusy(false);
        }
    }

    async function remove() {
        if (!window.confirm('Excluir esta atualização de saldo?')) return;
        setBusy(true);
        setMessage('');

        try {
            const response = await fetch(endpoint, {
                method: 'DELETE',
                credentials: 'same-origin',
            });

            if (!response.ok) {
                throw new Error('Não foi possível excluir a atualização.');
            }

            router.refresh();
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Erro inesperado.');
        } finally {
            setBusy(false);
        }
    }

    return (
        <div>
            <Button type="button" size="sm" variant="secondary" onClick={() => setEditing(!editing)}>
                {editing ? 'Fechar edição' : 'Corrigir'}
            </Button>
            <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={remove}>
                Excluir
            </Button>
            {editing && (
                <form className="finance-form" onSubmit={save}>
                    <label>
                        Saldo atualizado (R$)
                        <Input
                            name="amount"
                            inputMode="decimal"
                            defaultValue={(Number(snapshot.amountInCents) / 100).toFixed(2)}
                            required
                        />
                    </label>
                    <label>
                        Data
                        <Input name="date" type="date" defaultValue={snapshot.recordedAt} required />
                    </label>
                    <Button type="submit" disabled={busy}>Salvar correção</Button>
                </form>
            )}
            <span role="status">{message}</span>
        </div>
    );
}
