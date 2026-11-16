'use client';

import { useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input } from '@erikacarvalho/react';

export function InvoicePaymentForm({
    cardId,
    period,
    remainingInCents,
}: {
    cardId: string;
    period: string;
    remainingInCents: string;
}) {
    const router = useRouter();
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');
    const requestKey = useRef<string | null>(null);

    function toCents(value: string) {
        const match = /^(\d+)(?:[.,](\d{1,2}))?$/.exec(value.trim());

        if (!match) {
            throw new Error('Informe um valor válido com até duas casas decimais.');
        }

        const cents = BigInt(match[1]) * BigInt(100)
            + BigInt((match[2] ?? '').padEnd(2, '0') || '0');

        if (cents <= BigInt(0) || cents > BigInt(remainingInCents)) {
            throw new Error('O pagamento deve ser maior que zero e não ultrapassar o saldo.');
        }

        return cents.toString();
    }

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = event.currentTarget;
        setBusy(true);
        setMessage('');

        try {
            const values = new FormData(form);
            const amountInCents = toCents(String(values.get('amount')));
            const paidAt = String(values.get('paidAt'));

            if (!requestKey.current) {
                requestKey.current = crypto.randomUUID();
            }

            const response = await fetch(
                `/api/cards/${encodeURIComponent(cardId)}/invoices/${period}/payments`,
                {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        amountInCents,
                        paidAt,
                        idempotencyKey: requestKey.current,
                    }),
                },
            );

            if (!response.ok) {
                const result = await response.json().catch(() => ({}));
                throw new Error(result.error ?? 'Não foi possível registrar o pagamento.');
            }

            requestKey.current = null;
            form.reset();
            setMessage('Pagamento registrado.');
            router.refresh();
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Erro ao salvar pagamento.');
        } finally {
            setBusy(false);
        }
    }

    return (
        <form onSubmit={submit} className="finance-form">
            <label>
                Valor pago (R$)
                <Input
                    name="amount"
                    inputMode="decimal"
                    placeholder="150,00"
                    required
                />
            </label>
            <label>
                Data do pagamento
                <Input
                    name="paidAt"
                    type="date"
                    defaultValue={new Date().toISOString().slice(0, 10)}
                    required
                />
            </label>
            <Button type="submit" disabled={busy}>
                Registrar pagamento
            </Button>
            <span role="status">{message}</span>
        </form>
    );
}
