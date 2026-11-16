'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Button, Input } from '@erikacarvalho/react';

function parseReais(value: string) {
    const match = /^(\d+)(?:[.,](\d{1,2}))?$/.exec(value.trim());
    if (!match) throw new Error('Informe um valor válido com até duas casas decimais.');

    const cents = BigInt(match[1]) * BigInt(100)
        + BigInt((match[2] ?? '').padEnd(2, '0') || '0');

    if (cents <= BigInt(0)) throw new Error('O limite deve ser maior que zero.');
    return cents.toString();
}

export function NewCategoryForm() {
    const router = useRouter();
    const [message, setMessage] = useState('');
    const [busy, setBusy] = useState(false);

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = event.currentTarget;
        setBusy(true);
        setMessage('');

        try {
            const values = new FormData(form);
            const response = await fetch('/api/categories', {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: String(values.get('name')) }),
            });
            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw new Error(error.error ?? 'Não foi possível cadastrar a categoria.');
            }
            form.reset();
            setMessage('Categoria criada.');
            router.refresh();
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Erro ao salvar.');
        } finally {
            setBusy(false);
        }
    }

    return (
        <form className="finance-form" onSubmit={submit}>
            <label>
                Nova categoria
                <Input name="name" placeholder="Mercado" maxLength={100} required />
            </label>
            <Button type="submit" disabled={busy}>Adicionar categoria</Button>
            <span role="status">{message}</span>
        </form>
    );
}

export function BudgetLimitForm({
    categoryId,
    period,
    currentLimitInCents,
}: {
    categoryId: string;
    period: string;
    currentLimitInCents: string | null;
}) {
    const router = useRouter();
    const [message, setMessage] = useState('');
    const [busy, setBusy] = useState(false);

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const values = new FormData(event.currentTarget);
        setBusy(true);
        setMessage('');

        try {
            const response = await fetch('/api/budgets', {
                method: 'PUT',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    categoryId,
                    period,
                    limitInCents: parseReais(String(values.get('limit'))),
                }),
            });
            if (!response.ok) {
                const result = await response.json().catch(() => ({}));
                throw new Error(result.error ?? 'Não foi possível atualizar o limite.');
            }
            setMessage('Limite atualizado.');
            router.refresh();
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Erro ao salvar.');
        } finally {
            setBusy(false);
        }
    }

    return (
        <form className="finance-form" onSubmit={submit}>
            <label>
                Limite mensal (R$)
                <Input
                    name="limit"
                    inputMode="decimal"
                    defaultValue={currentLimitInCents
                        ? (Number(currentLimitInCents) / 100).toFixed(2)
                        : ''}
                    placeholder="500,00"
                    required
                />
            </label>
            <Button size="sm" type="submit" disabled={busy}>Salvar limite</Button>
            <span role="status">{message}</span>
        </form>
    );
}
