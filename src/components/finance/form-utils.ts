'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function toCents(value: string): string {
    const match = /^(\d+)(?:[.,](\d{1,2}))?$/.exec(value.trim());

    if (!match) {
        throw new Error('Informe um valor válido, com até duas casas decimais.');
    }

    return (BigInt(match[1]) * BigInt(100) + BigInt(
        (match[2] ?? '').padEnd(2, '0') || '0',
    )).toString();
}

export async function submitJson(url: string, body: unknown) {
    const response = await fetch(url, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const result = await response.json().catch(() => ({}));

        throw new Error(result.error ?? 'Não foi possível salvar os dados.');
    }
}

export function useFeedback() {
    const router = useRouter();
    const [message, setMessage] = useState('');
    const [saving, setSaving] = useState(false);

    async function save(action: () => Promise<void>) {
        setSaving(true);
        setMessage('');

        try {
            await action();
            setMessage('Salvo com sucesso.');
            router.refresh();
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Erro inesperado.');
        } finally {
            setSaving(false);
        }
    }

    return { message, saving, save };
}

