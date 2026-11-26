import Link from 'next/link';
import { Page } from '@/components/Page';
import { redirect } from 'next/navigation';
import { Card } from '@/components/ecds-v1/compat';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { listUserCards } from '@/modules/cards/service';
import { CardSettingsForm } from '@/components/cards/card-forms';
import { CardLimitForm } from '@/components/cards/card-limit-form';
import { getCardLimitOverview } from '@/modules/cards/limits';

export const dynamic = 'force-dynamic';

export default async function CardsPage() {
    const session = await auth();

    if (!session?.user?.id) {
        redirect('/sign-in');
    }

    const cards = await listUserCards(prisma, session.user.id);
    const limitEstimates = await Promise.all(cards.map(card =>
        getCardLimitOverview(prisma, session.user.id, card.id),
    ));
    const current = new Date();
    const periods = Array.from({ length: 4 }, (_, index) => {
        const period = new Date(Date.UTC(
            current.getUTCFullYear(),
            current.getUTCMonth() + index,
            1,
        ));

        return `${period.getUTCFullYear()}-${String(period.getUTCMonth() + 1).padStart(2, '0')}`;
    });

    return (
        <Page>
            <div className="finance-page">
            <h1>Cartões e faturas</h1>
            <p>
                Configure as datas de fechamento e vencimento. O valor da fatura é calculado
                a partir das compras registradas e das parcelas manuais vinculadas ao cartão.
            </p>
            <Card padding="lg">
                <h2>Adicionar cartão manualmente</h2>
                <CardSettingsForm />
            </Card>
            {cards.length === 0 && (
                <p>Nenhum cartão cadastrado. Adicione um cartão para visualizar faturas.</p>
            )}
            <div className="investment-grid">
                {cards.map((card, index) => (
                    <Card key={card.id} padding="lg">
                        <h2>{card.name}</h2>
                        <CardSettingsForm card={card} />
                        <h3>Limite e utilização estimada</h3>
                        <CardLimitForm cardId={card.id}
                            currentLimit={limitEstimates[index]?.creditLimitInCents.toString() ?? null} />
                        {limitEstimates[index] && (
                            <div>
                                <p>Limite informado: R$ {(Number(limitEstimates[index].creditLimitInCents) / 100).toFixed(2)}</p>
                                <p>Uso estimado: R$ {(Number(limitEstimates[index].estimatedUsedInCents) / 100).toFixed(2)}</p>
                                <p>Disponível estimado: R$ {(Number(limitEstimates[index].estimatedAvailableInCents) / 100).toFixed(2)}</p>
                                <p>O banco pode informar valores diferentes, pois este cálculo usa apenas registros da aplicação.</p>
                            </div>
                        )}
                        <h3>Faturas</h3>
                        <ul className="valuation-history">
                            {periods.map((period) => (
                                <li key={period}>
                                    <Link href={`/cards/${card.id}/invoices/${period}`}>
                                        Fatura {period}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </Card>
                ))}
            </div>
            </div>
        </Page>
    );
}
