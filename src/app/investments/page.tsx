import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Card } from '@erikacarvalho/react';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { listInvestments } from '@/modules/finance/service';
import { InvestmentForm } from '@/components/finance/forms';
import { InvestmentChart } from '@/components/finance/investment-chart';
import { InvestmentSnapshotEditor } from '@/components/finance/investment-snapshot-editor';

export const dynamic = 'force-dynamic';

export default async function InvestmentsPage() {
    const session = await auth();

    if (!session?.user?.id) {
        redirect('/sign-in');
    }

    const investments = await listInvestments(prisma, session.user.id);

    return (
        <main className="finance-page">
            <Link href="/">← Voltar ao dashboard</Link>
            <h1>Investimentos</h1>
            <Card padding="lg">
                <h2>Adicionar investimento</h2>
                <InvestmentForm />
            </Card>
            {investments.length === 0 && (
                <p>Cadastre sua primeira caixinha ou outro investimento.</p>
            )}
            <div className="investment-grid">
                {investments.map((investment) => (
                    <Card key={investment.id} padding="lg">
                        <h2>{investment.name}</h2>
                        <InvestmentChart
                            name={investment.name}
                            snapshots={investment.snapshots}
                        />
                        <h3>Histórico e correções</h3>
                        <ul className="valuation-history">
                            {investment.snapshots.map((snapshot) => (
                                <li key={snapshot.id}>
                                    {snapshot.recordedAt.toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                                    {' — R$ '}
                                    {(Number(snapshot.amountInCents) / 100).toFixed(2)}
                                    <InvestmentSnapshotEditor
                                        investmentId={investment.id}
                                        snapshot={{
                                            id: snapshot.id,
                                            amountInCents: snapshot.amountInCents.toString(),
                                            recordedAt: snapshot.recordedAt.toISOString().slice(0, 10),
                                        }}
                                    />
                                </li>
                            ))}
                        </ul>
                        <h3>Atualizar valor</h3>
                        <InvestmentForm investmentId={investment.id} />
                    </Card>
                ))}
            </div>
        </main>
    );
}
