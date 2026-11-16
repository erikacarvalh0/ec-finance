import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Card } from '@erikacarvalho/react';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { listFinancialGoals, calculateGoalProgress } from '@/modules/goals/service';
import { FinancialGoalForm } from '@/components/goals/financial-goal-form';

export const dynamic = 'force-dynamic';

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
function money(cents: bigint) { return currency.format(Number(cents) / 100); }

export default async function GoalsPage() {
    const session = await auth();
    if (!session?.user?.id) redirect('/sign-in');
    const goals = await listFinancialGoals(prisma, session.user.id);

    return (
        <main className="finance-page">
            <Link href="/">← Voltar ao dashboard</Link>
            <h1>Metas financeiras</h1>
            <p>Acompanhe metas e valores reservados informados manualmente. Esses valores não são saldos bancários sincronizados.</p>
            <Card padding="lg">
                <h2>Nova meta</h2>
                <FinancialGoalForm />
                <p>Informe os valores em centavos. Exemplo: 150000 representa R$ 1.500,00.</p>
            </Card>
            {goals.length === 0 && <p>Nenhuma meta cadastrada.</p>}
            <div className="investment-grid">
                {goals.map((goal) => {
                    const progress = calculateGoalProgress(goal.savedInCents, goal.targetInCents);
                    return (
                        <Card key={goal.id} padding="lg">
                            <h2>{goal.name}</h2>
                            <p>Reservado: {money(goal.savedInCents)}</p>
                            <p>Objetivo: {money(goal.targetInCents)}</p>
                            <p>Faltam: {money(progress.remainingInCents)}</p>
                            {goal.deadline && <p>Prazo: {goal.deadline.toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</p>}
                            <progress value={progress.percentage} max={100} aria-label={`Progresso da meta ${goal.name}`} />
                            <p>{progress.percentage}% concluído</p>
                        </Card>
                    );
                })}
            </div>
        </main>
    );
}
