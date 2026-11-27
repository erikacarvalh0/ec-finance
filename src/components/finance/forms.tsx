'use client';

import { useState, type FormEvent } from 'react';
import { Button, Input, Select } from '@/components/ecds-v1/compat';
import { toCents, submitJson, useFeedback } from './form-utils';
import styles from './income-form.module.css';
export { ExpenseForm } from '@/components/ExpenseForm';

export function IncomeForm({ categories = [], onSuccess }: {
    categories?: Array<{ id: string; name: string }>;
    onSuccess?: () => void;
}) {
    const feedback = useFeedback();
    const [type, setType] = useState('SALARY');

    async function onSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = event.currentTarget;
        const data = new FormData(form);

        await feedback.save(async () => {
            await submitJson('/api/incomes', {
                type,
                ...(data.get('categoryId') ? { categoryId: String(data.get('categoryId')) } : {}),
                amountInCents: toCents(String(data.get('amount'))),
                ...(type === 'RECURRING' ? {
                    responsible: String(data.get('responsible')),
                    description: String(data.get('description')),
                    date: String(data.get('date')),
                } : {}),
            });

            form.reset();
            onSuccess?.();
        });
    }

    return (
        <form onSubmit={onSubmit} className={styles['income-form']}>
            <label>Valor (R$)
                <Input name="amount" inputMode="decimal" placeholder="4500,00" required />
            </label>
            <label>Tipo
                <Select value={type} onChange={(event) => setType(event.target.value)}>
                    <option value="SALARY">Salário</option>
                    <option value="RECURRING">Recorrente</option>
                    <option value="OTHER">Outros</option>
                </Select>
            </label>
            <label>Categoria (opcional)
                <Select name="categoryId" defaultValue="">
                    <option value="">Sem categoria</option>
                    {categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
                </Select>
            </label>
            {type === 'RECURRING' && (
                <>
                    <label>Responsável
                        <Input name="responsible" required />
                    </label>
                    <label>Descrição
                        <Input name="description" required />
                    </label>
                    <label>Data
                        <Input name="date" type="date" required />
                    </label>
                </>
            )}
            <p className={styles['income-form__feedback']} role="status">{feedback.message}</p>
            <div className={styles['income-form__actions']}>
                <Button type="submit" disabled={feedback.saving}>Salvar entrada</Button>
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
