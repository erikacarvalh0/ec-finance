import { Page } from '@/components/dashboard/page';
import { redirect } from 'next/navigation';
import { Card } from '@/components/ecds-v1/compat';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { listInvestments } from '@/modules/finance/service';
import { InvestmentForm } from '@/components/finance/forms';
import { InvestmentChart } from '@/components/finance/investment-chart';
import { InvestmentSnapshotEditor } from '@/components/finance/investment-snapshot-editor';
import { InvestmentCashflowForm } from '@/components/finance/investment-cashflow-form';
import { summarizeInvestmentPerformance } from '@/modules/investments/performance';
import { calculateInvestmentSimpleReturn } from '@/modules/investments/percentage-return';
import { calculateTimeWeightedReturn } from '@/modules/investments/time-weighted-return';
import { calculateMoneyWeightedReturn } from '@/modules/investments/money-weighted-return';
import { summarizeInvestmentPortfolio } from '@/modules/investments/portfolio';
import { summarizePortfolioMonthlyHistory } from '@/modules/investments/portfolio-history';

export const dynamic = 'force-dynamic';

export default async function InvestmentsPage() {
    const session = await auth();

    if (!session?.user?.id) {
        redirect('/sign-in');
    }

    const investments = await listInvestments(prisma, session.user.id);
    const portfolio = summarizeInvestmentPortfolio(investments);
    const now = new Date();
    const historyStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1));
    const portfolioHistory = summarizePortfolioMonthlyHistory(
        investments, historyStart.getUTCFullYear(), historyStart.getUTCMonth() + 1, 6,
    );

    return (
        <Page>
            <div className="finance-page">
            <h1>Investimentos</h1>
            <Card padding="lg">
                <h2>Patrimônio investido estimado</h2>
                <p className="metric">R$ {(Number(portfolio.totalInCents) / 100).toFixed(2)}</p>
                <p>{portfolio.valuedCount} investimento(s) com avaliação registrada.</p>
                {portfolio.unvaluedCount > 0 && (
                    <p>{portfolio.unvaluedCount} investimento(s) sem avaliação não entram no total.</p>
                )}
                {portfolio.latestValuationAt && (
                    <p>Última avaliação registrada: {portfolio.latestValuationAt.toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</p>
                )}
                <p>Estimativa baseada no saldo mais recente de cada investimento. As avaliações podem ter datas diferentes e não são saldos bancários sincronizados.</p>
            </Card>
            <Card padding="lg">
                <h2>Evolução patrimonial estimada</h2>
                <p>Última avaliação disponível até o fim de cada mês. Meses sem nova avaliação reutilizam o último saldo conhecido.</p>
                <div className="table-scroll">
                    <table>
                        <thead>
                            <tr><th>Mês</th><th>Patrimônio estimado</th><th>Com avaliação</th><th>Sem avaliação</th></tr>
                        </thead>
                        <tbody>
                            {portfolioHistory.map((month) => (
                                <tr key={month.period}>
                                    <td>{month.period}</td>
                                    <td>{month.valuedCount > 0
                                        ? `R$ ${(Number(month.totalInCents) / 100).toFixed(2)}`
                                        : 'Sem dados'}</td>
                                    <td>{month.valuedCount}</td>
                                    <td>{month.unvaluedCount}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <p>Valores estimados com avaliações manuais; não representam cotações históricas sincronizadas.</p>
            </Card>
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
                        <h3>Aportes e resgates</h3>
                        <InvestmentCashflowForm investmentId={investment.id} />
                        <ul className="valuation-history">
                            {investment.cashflows.map((cashflow) => (
                                <li key={cashflow.id}>
                                    {cashflow.occurredAt.toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                                    {' — '}
                                    {cashflow.type === 'DEPOSIT' ? 'Aporte' : 'Resgate'}
                                    {': R$ '}
                                    {(Number(cashflow.amountInCents) / 100).toFixed(2)}
                                </li>
                            ))}
                        </ul>
                        {(() => {
                            const performance = summarizeInvestmentPerformance(
                                investment.snapshots,
                                investment.cashflows,
                            );
                            const percentageReturn = calculateInvestmentSimpleReturn(
                                investment.snapshots,
                                investment.cashflows,
                            );
                            const twr = calculateTimeWeightedReturn(
                                investment.snapshots,
                                investment.cashflows,
                            );
                            const mwr = calculateMoneyWeightedReturn(
                                investment.snapshots,
                                investment.cashflows,
                            );
                            return (
                                <div>
                                    <h3>Resultado estimado desde o primeiro saldo</h3>
                                    <p>Saldo mais recente: {performance.currentBalanceInCents === null
                                        ? 'Sem avaliação'
                                        : `R$ ${(Number(performance.currentBalanceInCents) / 100).toFixed(2)}`}</p>
                                    <p>Ganho ou perda estimado: {performance.estimatedGainInCents === null
                                        ? 'Informe saldos em ao menos duas datas diferentes'
                                        : `R$ ${(Number(performance.estimatedGainInCents) / 100).toFixed(2)}`}</p>
                                    <p>Rentabilidade percentual: {percentageReturn.percentage === null
                                        ? 'Indisponível'
                                        : `${percentageReturn.percentage.toFixed(2)}%`}</p>
                                    <p>Rentabilidade TWR: {twr.percentage === null
                                        ? 'Indisponível (faltam avaliações nas datas dos aportes/resgates ou dados válidos)'
                                        : `${twr.percentage.toFixed(2)}%`}</p>
                                    <p>Rentabilidade MWR/XIRR anualizada: {mwr.percentage === null
                                        ? 'Indisponível (datas, saldos ou fluxo sem solução válida)'
                                        : `${mwr.percentage.toFixed(2)}%`}</p>
                                    <p>TWR encadeia os retornos entre fluxos externos; MWR considera as datas e valores dos aportes e resgates. Avaliações são manuais e não representam rentabilidade garantida.</p>
                                    {percentageReturn.method === 'UNAVAILABLE_EXTERNAL_CASHFLOWS' && (
                                        <p>Há aportes ou resgates no período. O percentual exige cálculo por TWR ou MWR.</p>
                                    )}
                                    {percentageReturn.method === 'SIMPLE_RETURN' && (
                                        <p>Retorno simples entre avaliações, sem aportes ou resgates no intervalo.</p>
                                    )}
                                </div>
                            );
                        })()}
                        <h3>Atualizar valor</h3>
                        <InvestmentForm investmentId={investment.id} />
                    </Card>
                ))}
            </div>
            </div>
        </Page>
    );
}
