import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Card } from '@erikacarvalho/react';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getUserCardInvoice } from '@/modules/cards/service';

export const dynamic = 'force-dynamic';

const currency = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
});

function money(amount: bigint) {
    return currency.format(Number(amount) / 100);
}

export default async function InvoicePage({
    params,
}: {
    params: Promise<{ id: string; period: string }>;
}) {
    const session = await auth();

    if (!session?.user?.id) {
        redirect('/sign-in');
    }

    const { id, period } = await params;
    let invoice: Awaited<ReturnType<typeof getUserCardInvoice>>;

    try {
        invoice = await getUserCardInvoice(prisma, session.user.id, id, period);
    } catch (error) {
        if (error instanceof Error && error.message === 'Card not found') {
            notFound();
        }

        if (error instanceof Error && (
            error.message === 'Invalid invoice period'
            || error.message === 'Card billing cycle is not configured'
        )) {
            return (
                <main className="finance-page">
                    <Link href="/cards">← Voltar aos cartões</Link>
                    <h1>Fatura indisponível</h1>
                    <p>Confira as datas de fechamento e vencimento deste cartão.</p>
                </main>
            );
        }

        throw error;
    }

    return (
        <main className="finance-page">
            <Link href="/cards">← Voltar aos cartões</Link>
            <h1>Fatura {invoice.period}</h1>
            <Card padding="lg">
                <h2>Total previsto e registrado</h2>
                <p className="metric">{money(invoice.totalInCents)}</p>
                <p>
                    Vencimento: {invoice.dueDate.toLocaleDateString('pt-BR', {
                        timeZone: 'UTC',
                    })}
                </p>
                <p>
                    Essa é uma visão calculada. Não significa que o banco confirmou
                    o fechamento ou o pagamento da fatura.
                </p>
            </Card>
            <Card padding="lg">
                <h2>Compras e parcelas</h2>
                {invoice.lines.length === 0 && <p>Nenhum lançamento neste ciclo.</p>}
                <ul className="record-list">
                    {invoice.lines.map((line) => (
                        <li key={line.id}>
                            <strong>{line.description}</strong>
                            <span>{money(line.amountInCents)}</span>
                            <small>
                                {line.installmentLabel
                                    ? `Parcela ${line.installmentLabel}`
                                    : 'Compra registrada'}
                                {' · '}
                                {line.source === 'MANUAL' ? 'Manual' : 'Transação do cartão'}
                            </small>
                        </li>
                    ))}
                </ul>
            </Card>
        </main>
    );
}
