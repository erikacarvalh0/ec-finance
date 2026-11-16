'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Select } from '@erikacarvalho/react';

function parseMoney(value: string): string {
    const match = /^(\d+)(?:[.,](\d{1,2}))?$/.exec(value.trim());
    if (!match) throw new Error('Informe um valor válido.');
    const amount = BigInt(match[1]) * BigInt(100)
        + BigInt((match[2] ?? '').padEnd(2, '0') || '0');
    if (amount <= BigInt(0)) throw new Error('Informe um valor maior que zero.');
    return amount.toString();
}

export function InvestmentCashflowForm({
    investmentId,
}: { investmentId: string }) {
    const router = useRouter();
    const [busy, setBusy] = useState(false);
    const [feedback, setFeedback] = useState('');

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = event.currentTarget;
        const values = new FormData(form);
        setFeedback('');
        setBusy(true);

        try {
            const response = await fetch(
                `/api/investments/${encodeURIComponent(investmentId)}/cashflows`,
                {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: String(values.get('type')),
                        amountInCents: parseMoney(String(values.get('amount'))),
                        occurredAt: String(values.get('occurredAt')),
                    }),
                },
            );

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.error ?? 'Não foi possível registrar o movimento.');
            }
            setFeedback('Movimento registrado.');
            form.reset();
            router.refresh();
        } catch (error) {
            setFeedback(error instanceof Error ? error.message : 'Erro ao registrar.');
        } finally {
            setBusy(false);
        }
    }

    return (
        <form className="finance-form" onSubmit={submit}>
            <label>
                Movimento
                <Select name="type" defaultValue="DEPOSIT">
                    <option value="DEPOSIT">Aporte</option>
                    <option value="WITHDRAWAL">Resgate</option>
                </Select>
            </label>
            <label>
                Valor (R$)
                <Input name="amount" inputMode="decimal" placeholder="100,00" required />
            </label>
            <label>
                Data do movimento
                <Input
                    name="occurredAt"
                    type="date"
                    defaultValue={new Date().toISOString().slice(0, 10)}
                    required
                />
            </label>
            <Button type="submit" disabled={busy}>Registrar movimento</Button>
            <span role="status">{feedback}</span>
        </form>
    );
}
