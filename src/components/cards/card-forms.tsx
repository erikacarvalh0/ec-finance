'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Button, Input } from '@erikacarvalho/react';

type CardSettings = {
    id: string;
    name: string;
    closingDay: number | null;
    dueDay: number | null;
};

export function CardSettingsForm({ card }: { card?: CardSettings }) {
    const router = useRouter();
    const [message, setMessage] = useState('');
    const [saving, setSaving] = useState(false);

    async function onSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const targetForm = event.currentTarget;
        const values = new FormData(targetForm);
        const payload = {
            ...(card ? {} : { name: String(values.get('name')) }),
            closingDay: Number(values.get('closingDay')),
            dueDay: Number(values.get('dueDay')),
        };

        setSaving(true);
        setMessage('');

        try {
            const response = await fetch(card ? `/api/cards/${card.id}` : '/api/cards', {
                method: card ? 'PATCH' : 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const result = await response.json().catch(() => ({}));
                throw new Error(result.error ?? 'Não foi possível salvar o cartão.');
            }

            setMessage('Configurações salvas.');
            if (!card) {
                targetForm.reset();
            }

            router.refresh();
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Erro ao salvar.');
        } finally {
            setSaving(false);
        }
    }

    return (
        <form className="finance-form" onSubmit={onSubmit}>
            {!card && (
                <label>
                    Nome do cartão
                    <Input name="name" maxLength={100} required placeholder="Meu cartão" />
                </label>
            )}
            <label>
                Dia do fechamento
                <Input
                    name="closingDay"
                    type="number"
                    min={1}
                    max={31}
                    defaultValue={card?.closingDay ?? 10}
                    required
                />
            </label>
            <label>
                Dia do vencimento
                <Input
                    name="dueDay"
                    type="number"
                    min={1}
                    max={31}
                    defaultValue={card?.dueDay ?? 20}
                    required
                />
            </label>
            <Button type="submit" disabled={saving}>
                {card ? 'Atualizar datas' : 'Adicionar cartão'}
            </Button>
            <span role="status">{message}</span>
        </form>
    );
}

export function LinkImportedTransactionForm({
    expenseId,
    transactions,
}: {
    expenseId: string;
    transactions: Array<{ id: string; description: string; amountInCents: string }>;
}) {
    const router = useRouter();
    const [message, setMessage] = useState('');
    const [busy, setBusy] = useState(false);

    async function onSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const values = new FormData(event.currentTarget);
        setBusy(true);
        setMessage('');

        try {
            const response = await fetch(
                `/api/expenses/${expenseId}/card-link`,
                {
                    method: 'PATCH',
                    credentials: 'same-origin',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ transactionId: String(values.get('transactionId')) }),
                },
            );

            if (!response.ok) {
                const result = await response.json().catch(() => ({}));
                throw new Error(result.error ?? 'Não foi possível vincular.');
            }

            setMessage('Compra vinculada à transação. A duplicidade foi removida da fatura.');
            router.refresh();
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Erro ao vincular.');
        } finally {
            setBusy(false);
        }
    }

    if (transactions.length === 0) {
        return null;
    }

    return (
        <form className="finance-form" onSubmit={onSubmit}>
            <label>
                Vincular à compra importada (se for a mesma transação)
                <select name="transactionId" required defaultValue="">
                    <option value="" disabled>Escolha uma compra</option>
                    {transactions.map((transaction) => (
                        <option key={transaction.id} value={transaction.id}>
                            {transaction.description} — R$ {(Number(transaction.amountInCents) / 100).toFixed(2)}
                        </option>
                    ))}
                </select>
            </label>
            <Button size="sm" type="submit" disabled={busy}>Vincular compra</Button>
            <span role="status">{message}</span>
        </form>
    );
}
