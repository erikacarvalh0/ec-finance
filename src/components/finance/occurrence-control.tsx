'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button, Input, Select } from '@erikacarvalho/react';

type Status = 'PENDING' | 'SETTLED' | 'CANCELED';

function toCents(value: string): string | undefined {
    if (!value.trim()) {
        return undefined;
    }

    const match = /^(\d+)(?:[.,](\d{1,2}))?$/.exec(value.trim());

    if (!match) {
        throw new Error('Informe um valor válido com até duas casas decimais.');
    }

    return (
        BigInt(match[1]) * BigInt(100)
        + BigInt((match[2] ?? '').padEnd(2, '0') || '0')
    ).toString();
}

export function OccurrenceControl({
    kind,
    sourceId,
    month,
    initialStatus,
}: {
    kind: 'expense' | 'income';
    sourceId: string;
    month: string;
    initialStatus: Status;
}) {
    const router = useRouter();
    const [status, setStatus] = useState<Status>(initialStatus);
    const [amount, setAmount] = useState('');
    const [message, setMessage] = useState('');
    const [saving, setSaving] = useState(false);

    async function submit() {
        setSaving(true);
        setMessage('');

        try {
            const actualAmountInCents = status === 'SETTLED'
                ? toCents(amount)
                : undefined;

            const response = await fetch(
                `/api/forecast/${kind}/${encodeURIComponent(sourceId)}`,
                {
                    method: 'PATCH',
                    credentials: 'same-origin',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        month,
                        status,
                        ...(actualAmountInCents !== undefined
                            ? { actualAmountInCents }
                            : {}),
                    }),
                },
            );

            if (!response.ok) {
                throw new Error('Não foi possível atualizar este lançamento.');
            }

            setMessage('Atualizado.');
            router.refresh();
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Erro inesperado.');
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="occurrence-control">
            <Select
                aria-label="Status do lançamento"
                value={status}
                onChange={(event) => setStatus(event.target.value as Status)}
            >
                <option value="PENDING">Pendente</option>
                <option value="SETTLED">{kind === 'expense' ? 'Pago' : 'Recebido'}</option>
                <option value="CANCELED">Cancelado</option>
            </Select>
            {status === 'SETTLED' && (
                <Input
                    aria-label="Valor realizado em reais (opcional)"
                    inputMode="decimal"
                    placeholder="Valor real (opcional)"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                />
            )}
            <Button type="button" size="sm" disabled={saving} onClick={submit}>
                Salvar
            </Button>
            <span role="status">{message}</span>
        </div>
    );
}
