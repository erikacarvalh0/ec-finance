import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Card } from '@erikacarvalho/react';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getCategoryBudgetReport } from '@/modules/budgets/service';
import { NewCategoryForm, BudgetLimitForm } from '@/components/budgets/forms';

export const dynamic = 'force-dynamic';

const currency = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
});

function money(cents: bigint) {
    return currency.format(Number(cents) / 100);
}

const labels = {
    NO_BUDGET: 'Sem orçamento',
    ON_TRACK: 'Dentro do orçamento',
    NEAR_LIMIT: 'Próximo do limite (80% ou mais)',
    AT_LIMIT: 'Limite atingido',
    OVER_LIMIT: 'Orçamento ultrapassado',
};

export default async function BudgetsPage({
    searchParams,
}: {
    searchParams: Promise<{ period?: string }>;
}) {
    const session = await auth();
    if (!session?.user?.id) redirect('/sign-in');

    const { period: requested } = await searchParams;
    const currentPeriod = new Date().toISOString().slice(0, 7);
    const period = requested && /^\d{4}-(0[1-9]|1[0-2])$/.test(requested)
        ? requested
        : currentPeriod;
    const report = await getCategoryBudgetReport(prisma, session.user.id, period);

    return (
        <main className="finance-page">
            <Link href="/">← Voltar ao dashboard</Link>
            <h1>Orçamentos por categoria</h1>
            <p>
                Acompanhe os gastos registrados em cada categoria no mês escolhido.
                Os alertas começam em 80% do limite.
            </p>
            <Card padding="lg">
                <h2>Selecionar período</h2>
                <form action="/budgets">
                    <label>
                        Mês
                        <input type="month" name="period" defaultValue={period} required />
                    </label>
                    <button type="submit">Consultar</button>
                </form>
            </Card>
            <Card padding="lg">
                <h2>Categorias</h2>
                <NewCategoryForm />
            </Card>
            {report.categories.length === 0 && (
                <p>Adicione sua primeira categoria para configurar um orçamento.</p>
            )}
            <div className="investment-grid">
                {report.categories.map((category) => (
                    <Card key={category.categoryId} padding="lg">
                        <h2>{category.name}</h2>
                        <p><strong>{labels[category.status]}</strong></p>
                        <p>Gasto registrado: {money(category.spentInCents)}</p>
                        {category.limitInCents !== null && (
                            <>
                                <p>Limite: {money(category.limitInCents)}</p>
                                <p>
                                    {category.remainingInCents !== null
                                        && category.remainingInCents >= BigInt(0)
                                        ? 'Disponível'
                                        : 'Acima do limite'}:
                                    {' '}
                                    {money(category.remainingInCents! >= BigInt(0)
                                        ? category.remainingInCents!
                                        : -category.remainingInCents!)}
                                </p>
                                <progress
                                    max={100}
                                    value={Math.max(0, Math.min(category.percentage ?? 0, 100))}
                                    aria-label={`Consumo do orçamento ${category.name}`}
                                />
                                <p>{category.percentage}% utilizado</p>
                            </>
                        )}
                        <BudgetLimitForm
                            categoryId={category.categoryId}
                            period={period}
                            currentLimitInCents={category.limitInCents?.toString() ?? null}
                        />
                    </Card>
                ))}
            </div>
        </main>
    );
}
