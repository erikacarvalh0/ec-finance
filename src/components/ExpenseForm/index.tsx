'use client';

import { useRef, useState, type ComponentProps } from 'react';
import { Accordion } from '@erikacarvalho/react/Accordion';
import { Input } from '@erikacarvalho/react/Input';
import { Select } from '@erikacarvalho/react/Select';
import { Form } from '@erikacarvalho/react/Form';
import { Card } from '@/components/ecds-v1/compat';
import { toCents, submitJson, useFeedback } from '@/components/finance/form-utils';
import { validateAmount, validateDescription, validateInstallments } from './validation';
import styles from './index.module.css';

const paymentOptions = [
    { value: 'PIX', label: 'Pix' },
    { value: 'CREDIT', label: 'Crédito' },
    { value: 'DEBIT', label: 'Débito' },
    { value: 'AUTOMATIC_DEBIT', label: 'Débito automático' },
    { value: 'OTHER', label: 'Outros' },
];
const typeOptions = [{ value: 'VARIABLE', label: 'Variável' }, { value: 'FIXED', label: 'Fixa' }];

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
    const [revision, setRevision] = useState(0);
    const saving = useRef(false);

    function handlePaymentChange(value: string) {
        setPaymentMethod(value);
    }

    const handleSubmit: NonNullable<ComponentProps<typeof Form>['handleSubmit']> = async (values) => {
        if (saving.current) return;
        saving.current = true;
        try {
            await feedback.save(async () => {
                await submitJson('/api/expenses', {
                    description: String(values.description).trim(),
                    amountInCents: toCents(String(values.amount)),
                    paymentMethod: String(values.paymentMethod),
                    type: String(values.type),
                    installments: Number(values.installments || 1),
                    ...(values.categoryId ? { categoryId: String(values.categoryId) } : {}),
                    ...(values.paymentMethod === 'CREDIT' && values.cardId ? { cardId: String(values.cardId) } : {}),
                    ...(values.date ? { date: String(values.date) } : {}),
                });
                setPaymentMethod('PIX');
                setRevision(previous => previous + 1);
            });
        } finally {
            saving.current = false;
        }
    };

    return (
        <Card padding="lg">
            <Accordion title="Nova despesa" size="large" hasArrow defaultOpen={monthlyExpenseCount < 5}>
                <div aria-busy={feedback.saving}>
                    <fieldset disabled={feedback.saving} className={styles.fields}>
                        <Form key={revision} customClass={styles.form} handleSubmit={handleSubmit} buttonText="Salvar">
                            <Input name="amount" label="Valor (R$)" isRequired validate={validateAmount} />
                            <Input name="description" label="Descrição" isRequired validate={validateDescription} customClass={styles.description} />
                            <Select name="type" label="Tipo" options={typeOptions} defaultValue="VARIABLE" isRequired />
                            <Select name="paymentMethod" label="Forma de pagamento" options={paymentOptions} defaultValue="PIX" isRequired onValueChange={handlePaymentChange} />
                            <Select name="categoryId" label="Categoria (opcional)" options={[{ value: '', label: 'Sem categoria' }, ...categories.map(category => ({ value: category.id, label: category.name }))]} defaultValue="" />
                            <Input name="date" label="Data (opcional)" type="date" />
                            {['PIX', 'CREDIT', 'OTHER'].includes(paymentMethod) && (
                                <Input name="installments" label="Parcelas" type="number" defaultValue="1" isRequired validate={validateInstallments} />
                            )}
                            {paymentMethod === 'CREDIT' && (
                                <Select name="cardId" label="Cartão (opcional)" options={[{ value: '', label: 'Sem cartão associado' }, ...cards.map(card => ({ value: card.id, label: card.name }))]} defaultValue="" />
                            )}
                        </Form>
                    </fieldset>
                    <p className={styles.feedback} role="status">{feedback.message}</p>
                </div>
            </Accordion>
        </Card>
    );
}
