import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Card } from '@erikacarvalho/react';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getInvoicePaymentSummary } from '@/modules/cards/payment-service';
import { InvoicePaymentForm } from '@/components/cards/invoice-payment-form';
import { summarizeInvoiceAdjustments } from '@/modules/cards/adjustments';

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
    let record: Awaited<ReturnType<typeof getInvoicePaymentSummary>>;

    try {
        record = await getInvoicePaymentSummary(prisma, session.user.id, id, period);
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

    const { invoice, payments, summary } = record;
    const adjustments = summarizeInvoiceAdjustments(invoice.lines);
    const statusLabels = {
        OPEN: 'Aberta',
        CLOSED: 'Fechada',
        PARTIALLY_PAID: 'Parcialmente paga',
        PAID: 'Quitada',
    };

    return (
        <main className="finance-page">
            <Link href="/cards">← Voltar aos cartões</Link>
            <h1>Fatura {invoice.period}</h1>
            <Card padding="lg">
                <h2>Total previsto e registrado</h2>
                <p className="metric">{money(invoice.totalInCents)}</p>
                <p>Compras e parcelas: {money(adjustments.chargesInCents)}</p>
                <p>Créditos e estornos importados: {money(adjustments.creditsInCents)}</p>
                {adjustments.creditCount > 0 && (
                    <p>{adjustments.creditCount} lançamento(s) de crédito identificado(s) pelo valor negativo.</p>
                )}
                <p><strong>Status: {statusLabels[summary.status]}</strong></p>
                <p>Total pago: {money(summary.paidInCents)}</p>
                <p><strong>Saldo devedor: {money(summary.balanceInCents)}</strong></p>
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
                <h2>Pagamentos registrados manualmente</h2>
                {summary.balanceInCents > BigInt(0) && (
                    <InvoicePaymentForm
                        cardId={id}
                        period={period}
                        remainingInCents={summary.balanceInCents.toString()}
                    />
                )}
                {payments.length === 0 && <p>Nenhum pagamento registrado.</p>}
                <ul className="valuation-history">
                    {payments.map((payment) => (
                        <li key={payment.id}>
                            {payment.paidAt.toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                            {' — '}
                            {money(payment.amountInCents)}
                        </li>
                    ))}
                </ul>
                <p>Esses pagamentos são declarações manuais, não confirmações bancárias.</p>
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
                                    : line.amountInCents < BigInt(0) ? 'Crédito ou estorno importado' : 'Compra registrada'}
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
