'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import styles from './record-edit-form.module.css';
import { Button, Input, Select } from '@/components/ecds-v1/compat';

type ExpenseRecord = {
    kind: 'expense';
    id: string;
    description: string;
    amountInCents: string;
    type: 'FIXED' | 'VARIABLE';
    paymentMethod: string;
    date: string;
    installments: number;
    endsOn: string;
    categoryId?: string;
};

type IncomeRecord = {
    kind: 'income';
    categoryId?: string;
    id: string;
    amountInCents: string;
    type: 'SALARY' | 'RECURRING' | 'OTHER';
    responsible: string;
    description: string;
    date: string;
    endsOn: string;
};

function parseCurrency(value: string): string {
    const match = /^(\d+)(?:[.,](\d{1,2}))?$/.exec(value.trim());

    if (!match) {
        throw new Error('Informe um valor monetário válido.');
    }

    return (BigInt(match[1]) * BigInt(100)
        + BigInt((match[2] ?? '').padEnd(2, '0') || '0')).toString();
}

export function RecordEditForm({
    record,
    categories = [],
    inline = false,
    onSuccess,
}: {
    record: ExpenseRecord | IncomeRecord;
    categories?: Array<{ id: string; name: string }>;
    inline?: boolean;
    onSuccess?: () => void;
}) {
    const router = useRouter();
    const [expanded, setExpanded] = useState(false);
    const [type, setType] = useState<string>(record.type);
    const [feedback, setFeedback] = useState('');
    const [saving, setSaving] = useState(false);

    async function save(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const form = event.currentTarget;
        const values = new FormData(form);
        const amountInCents = parseCurrency(String(values.get('amount')));
        const recurring = record.kind === 'income' && type === 'RECURRING';

        const input = record.kind === 'expense' ? {
            description: String(values.get('description')),
            amountInCents,
            paymentMethod: String(values.get('paymentMethod')),
            type,
            installments: Number(values.get('installments')),
            ...(values.get('categoryId') ? { categoryId: String(values.get('categoryId')) } : {}),
            ...(values.get('date') ? { date: String(values.get('date')) } : {}),
            endsOn: type === 'FIXED' && Number(values.get('installments')) === 1
                ? String(values.get('endsOn')) || null
                : null,
        } : {
            type,
            amountInCents,
            ...(values.has('categoryId') ? { categoryId: String(values.get('categoryId')) || null } : {}),
            ...(recurring ? {
                responsible: String(values.get('responsible')),
                description: String(values.get('description')),
                date: String(values.get('date')),
                endsOn: String(values.get('endsOn')) || null,
            } : {}),
        };

        setSaving(true);
        setFeedback('');

        try {
            const route = record.kind === 'expense' ? 'expenses' : 'incomes';
            const response = await fetch(
                `/api/${route}/${encodeURIComponent(record.id)}`,
                {
                    method: 'PATCH',
                    credentials: 'same-origin',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(input),
                },
            );

            if (!response.ok) {
                const result = await response.json().catch(() => ({}));
                throw new Error(result.error ?? 'Não foi possível atualizar.');
            }

            setExpanded(false);
            setFeedback('Alterações salvas.');
            onSuccess?.();
            router.refresh();
        } catch (error) {
            setFeedback(error instanceof Error ? error.message : 'Erro ao atualizar.');
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className={inline ? styles['record-editor'] : "record-editor"}>
            {!inline && <Button type="button" variant="secondary" size="sm" onClick={() => setExpanded(!expanded)}>
                {expanded ? 'Fechar' : 'Editar'}
            </Button>}
            {(inline || expanded) && (
                <form className={inline ? styles['record-editor__form'] : "finance-form"} onSubmit={save}>
                    {record.kind === 'expense' && (
                        <label className={inline ? styles['record-editor__description'] : undefined}>
                            Descrição
                            <Input name="description" defaultValue={record.description} required />
                        </label>
                    )}
                    <label>
                        Valor (R$)
                        <Input
                            name="amount"
                            defaultValue={(Number(record.amountInCents) / 100).toFixed(2)}
                            inputMode="decimal"
                            required
                        />
                    </label>
                    <label>
                        Tipo
                        <Select value={type} onChange={(event) => setType(event.target.value)}>
                            {record.kind === 'expense' ? (
                                <>
                                    <option value="FIXED">Fixa</option>
                                    <option value="VARIABLE">Variável</option>
                                </>
                            ) : (
                                <>
                                    <option value="SALARY">Salário</option>
                                    <option value="RECURRING">Recorrente</option>
                                    <option value="OTHER">Outros</option>
                                </>
                            )}
                        </Select>
                    </label>
                    {record.kind === 'expense' && (
                        <>
                            <label>
                                Categoria (opcional)
                                <Select name="categoryId" defaultValue={record.categoryId ?? ''}>
                                    <option value="">Sem categoria</option>
                                    {categories.map((category) => (
                                        <option key={category.id} value={category.id}>
                                            {category.name}
                                        </option>
                                    ))}
                                </Select>
                            </label>
                            <label>
                                Forma de pagamento
                                <Select name="paymentMethod" defaultValue={record.paymentMethod}>
                                    <option value="PIX">Pix</option>
                                    <option value="CREDIT">Crédito</option>
                                    <option value="DEBIT">Débito</option>
                                    <option value="AUTOMATIC_DEBIT">Débito automático</option>
                                    <option value="OTHER">Outros</option>
                                </Select>
                            </label>
                            <label>
                                Data
                                <Input type="date" name="date" defaultValue={record.date} />
                            </label>
                            <label>
                                Parcelas
                                <Input
                                    type="number"
                                    name="installments"
                                    min={1}
                                    max={120}
                                    defaultValue={record.installments}
                                    required
                                />
                            </label>
                        </>
                    )}
                    {record.kind === 'income' && (
                        <label>Categoria (opcional)
                            <Select name="categoryId" defaultValue={record.categoryId ?? ''}>
                                <option value="">Sem categoria</option>
                                {categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
                            </Select>
                        </label>
                    )}
                    {record.kind === 'income' && type === 'RECURRING' && (
                        <>
                            <label>
                                Responsável
                                <Input name="responsible" defaultValue={record.responsible} required />
                            </label>
                            <label>
                                Descrição
                                <Input name="description" defaultValue={record.description} required />
                            </label>
                            <label>
                                Data inicial
                                <Input name="date" type="date" defaultValue={record.date} required />
                            </label>
                        </>
                    )}
                    {(record.kind === 'expense' && type === 'FIXED'
                        || record.kind === 'income' && type === 'RECURRING') && (
                        <label>
                            Encerrar recorrência em
                            <Input name="endsOn" type="date" defaultValue={record.endsOn} />
                        </label>
                    )}
                    <Button className={inline ? styles['record-editor__submit'] : undefined} type="submit" disabled={saving}>Salvar alterações</Button>
                </form>
            )}
            <span role="status">{feedback}</span>
        </div>
    );
}
