import { Button } from '@/components/ecds-v1/compat';
import { Page } from '@/components/Page';
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

import { InvestmentRegistration } from '@/components/InvestmentRegistration';
import styles from './page.module.css';

const money = (value: bigint) => new Intl.NumberFormat('pt-BR', {style:'currency',currency:'BRL'}).format(Number(value)/100);

export const dynamic = 'force-dynamic';

export default async function InvestmentsPage({searchParams}: {searchParams: Promise<{period?:string;type?:string;institution?:string;status?:string}>}) {
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

    const filters = await searchParams;
    const institutions = [...new Set(investments.flatMap(i=>i.institution ? [i.institution] : []))].sort();
    const start = new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()-11,1));
    const status = (i: typeof investments[number]) => !i.maturityAt ? 'Ativo' : i.maturityAt < new Date(now.toISOString().slice(0,10)) ? 'Vencido' : i.maturityAt.getTime()-now.getTime() <= 30*86400000 ? 'Vencendo' : 'Ativo';
    const visible = investments.filter(i=>(filters.period==='all'||(i.appliedAt??i.createdAt)>=start)&&(!filters.type||i.type===filters.type)&&(!filters.institution||i.institution===filters.institution)&&(!filters.status||status(i)===filters.status));
    const gains = investments.map(i=>summarizeInvestmentPerformance(i.snapshots,i.cashflows).estimatedGainInCents);
    const gain = gains.length && gains.every(g=>g!==null) ? gains.reduce<bigint>((sum,g)=>sum+(g??BigInt(0)),BigInt(0)) : null;
    return (
        <Page>
            <div className={`finance-page ${styles.investments}`}>
            <header><h1>Investimentos</h1><p>Registre, acompanhe e analise seus investimentos.</p></header>
            <section className={styles.metrics} aria-label="Indicadores de investimentos">
                {[
                    ['Patrimônio investido',portfolio.valuedCount?money(portfolio.totalInCents):'—',portfolio.valuedCount+' com avaliação; '+portfolio.unvaluedCount+' sem avaliação','◈'],
                    ['Rentabilidade do período','—','Retorno agregado ainda indisponível','%'],
                    ['Rendimento',gain===null?'—':money(gain),'Estimado desde as primeiras avaliações','↗'],
                    ['Meta de investimentos','—','Meta não configurada','◎'],
                ].map(([label,value,detail,icon])=><article key={label} className={styles.metric}><span className={styles.icon} aria-hidden="true">{icon}</span><div><h2>{label}</h2><strong>{value}</strong><small>{detail}</small></div></article>)}
            </section>
            <section className={styles.panel}><h2>Novo investimento</h2><InvestmentRegistration institutions={institutions}/></section>
            <section className={styles.panel}><h2>Histórico de investimentos</h2>
                <form action="/investments" className={styles.filters}>
                    <label>Período<select name="period" defaultValue={filters.period??'12'}><option value="12">Últimos 12 meses</option><option value="all">Todos os períodos</option></select></label>
                    <label>Tipo<select name="type" defaultValue={filters.type??''}><option value="">Todos</option>{['Renda Fixa','Tesouro Direto','Renda Variável','Outros'].map(t=><option key={t}>{t}</option>)}</select></label>
                    <label>Instituição<select name="institution" defaultValue={filters.institution??''}><option value="">Todas</option>{institutions.map(t=><option key={t}>{t}</option>)}</select></label>
                    <label>Status<select name="status" defaultValue={filters.status??''}><option value="">Todos</option>{['Ativo','Vencendo','Vencido'].map(t=><option key={t}>{t}</option>)}</select></label>
                    <Button type="submit">Aplicar filtros</Button>
                </form>
                <div className={styles.scroll}><table><thead><tr>{['Data','Descrição','Tipo','Instituição','Valor','Taxa / rentabilidade','Status','Ações'].map(t=><th key={t} scope="col">{t}</th>)}</tr></thead><tbody>{visible.map(i=>{const p=summarizeInvestmentPerformance(i.snapshots,i.cashflows);return <tr key={i.id}><td>{(i.appliedAt??i.createdAt).toLocaleDateString('pt-BR',{timeZone:'UTC'})}</td><td>{i.name}</td><td><span className={styles.badge} data-type={i.type}>{i.type??'Não informado'}</span></td><td>{i.institution??'—'}</td><td>{p.currentBalanceInCents===null?'—':money(p.currentBalanceInCents)}</td><td>{i.contractedRate??'—'}</td><td><span className={styles.badge} data-status={status(i)}>{status(i)}</span></td><td><a className={styles.action} href={'#investment-'+i.id} aria-label={'Detalhes de '+i.name}>⋯</a></td></tr>})}</tbody></table></div>
                {!visible.length&&<p>Nenhum investimento encontrado.</p>}
            </section>
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
            {investments.length === 0 && (
                <p>Cadastre sua primeira caixinha ou outro investimento.</p>
            )}
            <div className="investment-grid">
                {investments.map((investment) => (
                    <Card key={investment.id} padding="lg">
                        <div id={`investment-${investment.id}`} />
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
