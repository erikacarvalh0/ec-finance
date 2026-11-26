'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ecds-v1/compat';

export function ExpensePayment({ id, month, paid }: { id: string; month: string; paid: boolean }) {
    const router = useRouter();
    const [confirming, setConfirming] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    function requestConfirmation() {
        setConfirming(true);
    }

    function cancelConfirmation() {
        setConfirming(false);
    }

    async function savePayment() {
        setSaving(true);
        setMessage('');

        try {
            const response = await fetch(`/api/forecast/expense/${encodeURIComponent(id)}`, {
                method: 'PATCH',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ month, status: paid ? 'PENDING' : 'SETTLED' }),
            });

            if (!response.ok) {
                throw new Error('Não foi possível atualizar o pagamento.');
            }

            setConfirming(false);
            router.refresh();
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Erro inesperado.');
        } finally {
            setSaving(false);
        }
    }

    return (
        <div>
            <Button type="button" disabled={saving} onClick={requestConfirmation}>
                {paid ? 'Marcar como pendente' : 'Marcar como paga'}
            </Button>
            {confirming && (
                <div role="group" aria-label="Confirmar pagamento">
                    <p>{paid ? 'Reverter o pagamento desta parcela?' : 'Confirmar pagamento desta parcela?'}</p>
                    <Button type="button" disabled={saving} onClick={cancelConfirmation}>Cancelar</Button>
                    <Button type="button" disabled={saving} onClick={savePayment}>Confirmar</Button>
                </div>
            )}
            <p role="status">{message}</p>
        </div>
    );
}
