'use client';

import { useState, type FormEvent } from 'react';
import { Button, Card, Input, Select } from '@erikacarvalho/react';
import { useRouter } from 'next/navigation';

function toCents(value: string): string {
    const match = /^(\d+)(?:[.,](\d{1,2}))?$/.exec(value.trim());

    if (!match) {
        throw new Error('Informe um valor válido, com até duas casas decimais.');
    }

    return (BigInt(match[1]) * BigInt(100) + BigInt(
        (match[2] ?? '').padEnd(2, '0') || '0',
    )).toString();
}

async function submitJson(url: string, body: unknown) {
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

function useFeedback() {
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

export function ExpenseForm({
    cards = [],
    categories = [],
}: {
    cards?: Array<{ id: string; name: string }>;
    categories?: Array<{ id: string; name: string }>;
}) {
    const feedback = useFeedback();
    const [paymentMethod, setPaymentMethod] = useState('PIX');
    const [type, setType] = useState('VARIABLE');

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
            <h2>Nova despesa</h2>
            <form onSubmit={onSubmit} className="finance-form">
                <label>Descrição
                    <Input name="description" maxLength={255} required />
                </label>
                <label>Valor (R$)
                    <Input name="amount" inputMode="decimal" placeholder="150,00" required />
                </label>
                <label>Forma de pagamento
                    <Select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
                        <option value="PIX">Pix</option>
                        <option value="CREDIT">Crédito</option>
                        <option value="DEBIT">Débito</option>
                        <option value="AUTOMATIC_DEBIT">Débito automático</option>
                        <option value="OTHER">Outros</option>
                    </Select>
                </label>
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
                <label>Tipo
                    <Select value={type} onChange={(event) => setType(event.target.value)}>
                        <option value="VARIABLE">Variável</option>
                        <option value="FIXED">Fixa</option>
                    </Select>
                </label>
                <label>Data (opcional)
                    <Input name="date" type="date" />
                </label>
                <label>Parcelas
                    <Input name="installments" type="number" min={1} max={120} defaultValue={1} required />
                </label>
                <Button type="submit" disabled={feedback.saving}>Salvar despesa</Button>
                <p role="status">{feedback.message}</p>
            </form>
        </Card>
    );
}

export function IncomeForm() {
    const feedback = useFeedback();
    const [type, setType] = useState('SALARY');

    async function onSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = event.currentTarget;
        const data = new FormData(form);

        await feedback.save(async () => {
            await submitJson('/api/incomes', {
                type,
                amountInCents: toCents(String(data.get('amount'))),
                ...(type === 'RECURRING' ? {
                    responsible: String(data.get('responsible')),
                    description: String(data.get('description')),
                    date: String(data.get('date')),
                } : {}),
            });

            form.reset();
        });
    }

    return (
        <Card padding="lg">
            <h2>Nova entrada</h2>
            <form onSubmit={onSubmit} className="finance-form">
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
                <Button type="submit" disabled={feedback.saving}>Salvar entrada</Button>
                <p role="status">{feedback.message}</p>
            </form>
        </Card>
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
