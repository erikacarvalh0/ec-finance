import { Page } from '@/components/page';
import { redirect } from 'next/navigation';
import { Card } from '@/components/ecds-v1/compat';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getCategoryBudgetReport } from '@/modules/budgets/service';
import { NewCategoryForm, BudgetLimitForm } from '@/components/budgets/forms';
import { CopyPreviousMonthBudgets } from '@/components/budgets/copy-previous';
import { calculateBudgetCarryover, previousBudgetPeriod } from '@/modules/budgets/carryover';

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
    const [report, previousReport] = await Promise.all([
        getCategoryBudgetReport(prisma, session.user.id, period),
        getCategoryBudgetReport(prisma, session.user.id, previousBudgetPeriod(period)),
    ]);
    const previousCategories = new Map(previousReport.categories.map((category) => [
        category.categoryId, category,
    ]));

    return (
        <Page>
            <div className="finance-page">
            <h1>Orçamentos por categoria</h1>
            <p>
                Acompanhe os gastos registrados em cada categoria no mês escolhido.
                Os alertas começam em 80% do limite.
                A simulação de saldo acumulado considera apenas a sobra do mês anterior,
                sem alterar os limites ou os alertas cadastrados.
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
                <h2>Reutilizar orçamento</h2>
                <p>Copie os limites do mês anterior apenas para categorias ainda sem limite neste mês.</p>
                <CopyPreviousMonthBudgets targetPeriod={period} />
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
                                {!category.rolloverApplied && (() => {
                                    const previous = previousCategories.get(category.categoryId);
                                    const carryover = calculateBudgetCarryover({
                                        previousLimitInCents: previous?.limitInCents ?? null,
                                        previousSpentInCents: previous?.spentInCents ?? BigInt(0),
                                        currentLimitInCents: category.limitInCents!,
                                        currentSpentInCents: category.spentInCents,
                                    });
                                    return (
                                        <p>
                                            Saldo com sobra do mês anterior (simulação):{' '}
                                            {money(carryover.combinedAvailableInCents)}
                                            {' '}— sobra anterior: {money(carryover.previousUnusedInCents)}
                                        </p>
                                    );
                                })()}
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
            </div>
        </Page>
    );
}
