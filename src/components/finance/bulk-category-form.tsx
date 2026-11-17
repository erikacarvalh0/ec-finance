'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Row = { id: string; description: string; categoryId: string | null };
type Category = { id: string; name: string };

export function BulkCategoryForm({ rows, categories }: { rows: Row[]; categories: Category[] }) {
    const router = useRouter();
    const [ids, setIds] = useState<string[]>([]);
    const [categoryId, setCategoryId] = useState('');
    const [preview, setPreview] = useState<Row[] | null>(null);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');
    async function submit(isPreview: boolean) {
        setBusy(true);
        setMessage('');
        try {
            const response = await fetch('/api/expenses/bulk-category', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids, categoryId: categoryId || null, preview: isPreview }),
            });
            if (!response.ok) throw new Error('Não foi possível reclassificar as despesas.');
            const data = await response.json();
            if (isPreview) setPreview(data.rows);
            else {
                setIds([]);
                setPreview(null);
                setMessage('Despesas atualizadas.');
                router.refresh();
            }
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Erro inesperado.');
        } finally {
            setBusy(false);
        }
    }
    return (
        <section aria-label="Reclassificação em massa">
            <h3>Reclassificar despesas desta página</h3>
            <fieldset disabled={busy}>
                <legend>Selecionar despesas</legend>
                {rows.map(row => (
                    <label key={row.id}>
                        <input type="checkbox" checked={ids.includes(row.id)} onChange={event => {
                            setIds(old => event.target.checked ? [...old, row.id] : old.filter(id => id !== row.id));
                            setPreview(null);
                        }} /> {row.description}
                    </label>
                ))}
                <label>Nova categoria
                    <select value={categoryId} onChange={event => {
                        setCategoryId(event.target.value);
                        setPreview(null);
                    }}>
                        <option value="">Sem categoria</option>
                        {categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
                    </select>
                </label>
                <button type="button" disabled={!ids.length} onClick={() => void submit(true)}>Visualizar alterações</button>
                {preview && <>
                    <p>Alterar {preview.length} despesas para {categories.find(item => item.id === categoryId)?.name ?? 'Sem categoria'}?</p>
                    <ul>{preview.map(row => <li key={row.id}>{row.description}</li>)}</ul>
                    <button type="button" onClick={() => void submit(false)}>Confirmar reclassificação</button>
                </>}
            </fieldset>
            <p role="status">{message}</p>
        </section>
    );
}
