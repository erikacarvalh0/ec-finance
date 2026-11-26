'use client';

import { useState, type FormEvent, type ChangeEvent } from 'react';
import { Accordion } from '@erikacarvalho/react/Accordion';
import { Button, Card, Input, Select } from '@/components/ecds-v1/compat';
import { toCents, submitJson, useFeedback } from '@/components/finance/form-utils';
import styles from './index.module.css';

export function ExpenseForm({
    cards = [],
    categories = [],
    monthlyExpenseCount = 0,
}: {
    monthlyExpenseCount?: number;
    cards?: Array<{ id: string; name: string }>;
    categories?: Array<{ id: string; name: string }>;
}) {
    const feedback = useFeedback();
    const [paymentMethod, setPaymentMethod] = useState('PIX');
    const [type, setType] = useState('VARIABLE');

    function handlePaymentChange(event: ChangeEvent<HTMLSelectElement>) {
        setPaymentMethod(event.target.value);
    }

    function handleTypeChange(event: ChangeEvent<HTMLSelectElement>) {
        setType(event.target.value);
    }

    async function onSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = event.currentTarget;
        const data = new FormData(form);

        await feedback.save(async () => {
            await submitJson('/api/expenses', {
                description: String(data.get('description')),
                amountInCents: toCents(String(data.get('amount'))),
                paymentMethod,
                type,
                installments: Number(data.get('installments') || 1),
                ...(data.get('categoryId')
                    ? { categoryId: String(data.get('categoryId')) }
                    : {}),
                ...(paymentMethod === 'CREDIT' && data.get('cardId')
                    ? { cardId: String(data.get('cardId')) }
                    : {}),
                ...(data.get('date') ? { date: String(data.get('date')) } : {}),
            });

            form.reset();
        });
    }

    return (
        <Card padding="lg">
            <Accordion title="Nova despesa" size="large" hasArrow defaultOpen={monthlyExpenseCount < 5}>
                <form onSubmit={onSubmit} className={styles.form}>
                    <label>Valor (R$)
                        <Input name="amount" inputMode="decimal" placeholder="150,00" required />
                    </label>
                    <label className={styles.description}>Descrição
                        <Input name="description" maxLength={255} required />
                    </label>
                    <label>Tipo
                        <Select value={type} onChange={handleTypeChange}>
                            <option value="VARIABLE">Variável</option>
                            <option value="FIXED">Fixa</option>
                        </Select>
                    </label>
                    <label>Forma de pagamento
                        <Select value={paymentMethod} onChange={handlePaymentChange}>
                            <option value="PIX">Pix</option>
                            <option value="CREDIT">Crédito</option>
                            <option value="DEBIT">Débito</option>
                            <option value="AUTOMATIC_DEBIT">Débito automático</option>
                            <option value="OTHER">Outros</option>
                        </Select>
                    </label>
                    <label>
                        Categoria (opcional)
                        <Select name="categoryId" defaultValue="">
                            <option value="">Sem categoria</option>
                            {categories.map((category) => (
                                <option key={category.id} value={category.id}>
                                    {category.name}
                                </option>
                            ))}
                        </Select>
                    </label>
                    <label>Data (opcional)
                        <Input name="date" type="date" />
                    </label>
                    {['PIX', 'CREDIT', 'OTHER'].includes(paymentMethod) && (
                        <label>Parcelas
                            <Input name="installments" type="number" min={1} max={120} defaultValue={1} required />
                        </label>
                    )}
                    {paymentMethod === 'CREDIT' && (
                        <label>
                            Cartão (opcional)
                            <Select name="cardId" defaultValue="">
                                <option value="">Sem cartão associado</option>
                                {cards.map((card) => (
                                    <option key={card.id} value={card.id}>{card.name}</option>
                                ))}
                            </Select>
                        </label>
                    )}
                    <div className={styles.submit}>
                        <Button type="submit" disabled={feedback.saving}>Salvar despesa</Button>
                    </div>
                    <p className={styles.feedback} role="status">{feedback.message}</p>
                </form>
            </Accordion>
        </Card>
    );
}

