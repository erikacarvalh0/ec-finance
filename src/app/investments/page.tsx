import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Card } from '@erikacarvalho/react';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { listInvestments } from '@/modules/finance/service';
import { InvestmentForm } from '@/components/finance/forms';
import { InvestmentChart } from '@/components/finance/investment-chart';

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
                        <h3>Atualizar valor</h3>
                        <InvestmentForm investmentId={investment.id} />
                    </Card>
                ))}
            </div>
        </main>
    );
}
