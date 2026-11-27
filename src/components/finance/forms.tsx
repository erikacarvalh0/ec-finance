'use client';

import { useRef, useState, type FormEvent } from 'react';
import { Button, Input } from '@/components/ecds-v1/compat';
import { toCents, submitJson, useFeedback } from './form-utils';
import styles from './income-form.module.css';
export { ExpenseForm } from '@/components/ExpenseForm';

export function IncomeForm({ categories = [], onSuccess, onCancel, onDirty }: {
    categories?: Array<{ id: string; name: string }>;
    onSuccess?: () => void;
    onCancel?: () => void;
    onDirty?: () => void;
}) {
    const feedback = useFeedback();
    const [type, setType] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const submitting = useRef(false);

    async function onSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (submitting.current) return;
        const data = new FormData(event.currentTarget);
        const description = String(data.get('description') ?? '').trim();
        const date = String(data.get('date') ?? '');
        const categoryId = String(data.get('categoryId') ?? '');
        const nextErrors: Record<string, string> = {};
        let amountInCents = '0';
        if (!description) nextErrors.description = 'Informe uma descrição.';
        try {
            amountInCents = toCents(String(data.get('amount') ?? '').replace(/\.(?=\d{3}(?:[.,]|$))/g, ''));
            if (BigInt(amountInCents) <= BigInt(0) || amountInCents.length > 18) throw new Error();
        } catch {
            nextErrors.amount = 'Informe um valor maior que zero.';
        }
        if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) nextErrors.date = 'Informe uma data válida.';
        if (!categoryId) nextErrors.categoryId = 'Selecione uma categoria.';
        if (!type) nextErrors.type = 'Selecione o tipo de entrada.';
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length) return;
        submitting.current = true;
        try {
            await feedback.save(async () => {
                await submitJson('/api/incomes', { type, categoryId, amountInCents, description, date });
                onSuccess?.();
            });
        } finally {
            submitting.current = false;
        }
    }

    function error(name: string) {
        return <small id={`income-error-${name}`} className={styles['income-form__error']}>{errors[name]}</small>;
    }

    function attributes(name: string) {
        return { required: true, 'aria-invalid': Boolean(errors[name]), 'aria-describedby': `income-error-${name}` };
    }

    return (
        <form noValidate onSubmit={onSubmit} onChange={onDirty} className={styles['income-form']}>
            <p className={styles['income-form__intro']}>Registre uma nova receita no seu controle financeiro.</p>
            <label className={styles['income-form__wide']}>
                <span>Descrição <b>*</b></span>
                <input name="description" autoFocus maxLength={255} placeholder="Ex.: Salário, Freelance, Reembolso" {...attributes('description')} />
                {error('description')}
            </label>
            <label>
                <span>Valor (R$) <b>*</b></span>
                <input name="amount" inputMode="decimal" placeholder="0,00" {...attributes('amount')} />
                {error('amount')}
            </label>
            <label>
                <span>Data da entrada <b>*</b></span>
                <input name="date" type="date" {...attributes('date')} />
                {error('date')}
            </label>
            <label className={styles['income-form__wide']}>
                <span>Categoria <b>*</b></span>
                <select name="categoryId" defaultValue="" {...attributes('categoryId')}>
                    <option value="" disabled>Selecione</option>
                    {categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
                {error('categoryId')}
            </label>
            <label className={styles['income-form__wide']}>
                <span>Tipo <b>*</b></span>
                <select name="type" value={type} onChange={event => setType(event.target.value)} {...attributes('type')}>
                    <option value="" disabled>Selecione</option>
                    <option value="RECURRING">Recorrente</option>
                    <option value="OTHER">Eventual</option>
                </select>
                {error('type')}
                {type && <small className={styles['income-form__hint']}>{type === 'RECURRING' ? 'Se repete todos os meses.' : 'Acontece uma única vez.'}</small>}
            </label>
            <p className={styles['income-form__feedback']} role="status">{feedback.message}</p>
            <div className={styles['income-form__actions']}>
                <button type="button" disabled={feedback.saving} onClick={onCancel}>Cancelar</button>
                <button type="submit" disabled={feedback.saving}>{feedback.saving ? 'Salvando…' : 'Salvar entrada'}</button>
            </div>
        </form>
    );
}

export function InvestmentForm({ investmentId }: { investmentId?: string }) {
    const feedback = useFeedback();

    async function onSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = event.currentTarget;
        const data = new FormData(form);

        await feedback.save(async () => {
            if (investmentId) {
                await submitJson(`/api/investments/${investmentId}/snapshots`, {
                    amountInCents: toCents(String(data.get('amount'))),
                    recordedAt: String(data.get('date')),
                });
            } else {
                await submitJson('/api/investments', {
                    name: String(data.get('name')),
                });
            }

            form.reset();
        });
    }

    return (
        <form onSubmit={onSubmit} className="finance-form">
            {investmentId ? (
                <>
                    <label>Valor atualizado (R$)
                        <Input name="amount" inputMode="decimal" required />
                    </label>
                    <label>Data da atualização
                        <Input name="date" type="date" required />
                    </label>
                </>
            ) : (
                <label>Nome do investimento
                    <Input name="name" placeholder="Caixinha" required />
                </label>
            )}
            <Button type="submit" disabled={feedback.saving}>
                {investmentId ? 'Registrar saldo atualizado' : 'Criar investimento'}
            </Button>
            <p role="status">{feedback.message}</p>
        </form>
    );
}

export function MarkFixedButton({ transactionId }: { transactionId: string }) {
    const feedback = useFeedback();

    return (
        <div>
            <Button
                size="sm"
                variant="secondary"
                disabled={feedback.saving}
                onClick={() => feedback.save(() => submitJson(
                    `/api/transactions/${transactionId}/fixed`,
                    {},
                ))}
            >
                Marcar como fixa
            </Button>
            <span role="status">{feedback.message}</span>
        </div>
    );
}
