import Link from 'next/link';
import { Calendar, CreditCard } from '@erikacarvalho/react/Icons';
import { Card } from '@/components/ecds-v1/compat';
import { MarkFixedButton } from '@/components/finance/forms';
import styles from './overview-details.module.css';

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const money = (cents: bigint) => currency.format(Number(cents) / 100);
const symbols: Record<string, string> = {
    'shopping-cart': '🛒', house: '⌂', 'car-front': '🚗', heart: '♥',
    ellipsis: '…', wallet: '▣', briefcase: '▰', 'trending-up': '↗',
    'arrow-left-right': '↔',
};

type ForecastMonth = {
    year: number; month: number; expenseTotalInCents: bigint; incomeTotalInCents: bigint;
    balanceInCents: bigint; settledIncomeInCents: bigint; settledExpenseInCents: bigint;
    pendingIncomeInCents: bigint; pendingExpenseInCents: bigint;
};
type BudgetCategory = {
    categoryId: string; name: string; spentInCents: bigint; limitInCents: bigint | null;
    percentage: number | null; status: string; color: string; iconBackground: string; icon: string;
};
type FixedExpense = { id: string; description: string; amountInCents: bigint; date: Date | null };
type FixedCardTransaction = { id: string; description: string; amountInCents: bigint; occurredAt: Date };
type CardTransaction = {
    id: string; description: string; amountInCents: bigint; isFixed: boolean;
    occurredAt: Date; cardId: string | null;
};

const dateLabel = (date: Date) => new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', timeZone: 'UTC',
}).format(date);

export function OverviewDetails({
    forecast, categories, fixedExpenses, fixedCardTransactions, cardTransactions, selectedPeriod,
}: {
    forecast: ForecastMonth[];
    categories: BudgetCategory[];
    fixedExpenses: FixedExpense[];
    fixedCardTransactions: FixedCardTransaction[];
    cardTransactions: CardTransaction[];
    selectedPeriod: string;
}) {
    return (
        <section className={styles.sections} aria-label="Planejamento e acompanhamento financeiro">
            <Card padding="lg" className={styles.card}>
                <header className={styles.heading}>
                    <h2>Previsão dos próximos meses</h2>
                    <Link className={styles.link} href="/forecast">Ver planejamento <span aria-hidden="true">→</span></Link>
                </header>
                <p className={styles.description}>
                    Parcelas e recorrências calculadas a partir dos registros existentes.
                    São previsões, não cobranças confirmadas.
                </p>
                <div className={styles.scroll} tabIndex={0} role="region" aria-label="Tabela de previsão financeira">
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th scope="col">Mês</th>
                                <th scope="col">Despesas previstas</th>
                                <th scope="col">Entradas previstas</th>
                                <th scope="col">Saldo projetado</th>
                                <th scope="col">Realizado</th>
                                <th scope="col">Pendente</th>
                            </tr>
                        </thead>
                        <tbody>
                            {forecast.map(month => {
                                const period = `${month.year}-${String(month.month).padStart(2, '0')}`;
                                const isCurrent = period === selectedPeriod;
                                return (
                                    <tr key={period} className={isCurrent ? styles.current : undefined}>
                                        <th scope="row">
                                            <span className={styles.monthName}>
                                                {new Intl.DateTimeFormat('pt-BR', { month: 'short', year: 'numeric', timeZone: 'UTC' })
                                                    .format(new Date(Date.UTC(month.year, month.month - 1, 1)))}
                                                {isCurrent && <span className={styles.currentTag}>Atual</span>}
                                            </span>
                                        </th>
                                        <td>{money(month.expenseTotalInCents)}</td>
                                        <td>{money(month.incomeTotalInCents)}</td>
                                        <td className={month.balanceInCents >= BigInt(0) ? styles.positive : styles.negative}>
                                            {money(month.balanceInCents)}
                                        </td>
                                        <td>{money(month.settledIncomeInCents - month.settledExpenseInCents)}</td>
                                        <td>{money(month.pendingIncomeInCents - month.pendingExpenseInCents)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </Card>
            <div className={styles.tracking}>
                <Card padding="lg" className={styles.card}>
                    <header className={styles.heading}><h2>Orçamentos deste mês</h2></header>
                    {categories.length === 0 ? (
                        <p className={styles.muted}>Nenhuma categoria cadastrada.</p>
                    ) : (
                        <ul className={styles.budgetList}>
                            {categories.map(category => (
                                <li className={styles.budgetItem} key={category.categoryId}>
                                    <span className={styles.categoryIcon} aria-hidden="true"
                                        style={{ color: category.color, backgroundColor: category.iconBackground }}>
                                        {symbols[category.icon] ?? '▣'}
                                    </span>
                                    <div className={styles.budgetContent}>
                                        <div className={styles.budgetRow}>
                                            <strong>{category.name}</strong>
                                            <strong className={styles.amount}>{money(category.spentInCents)}</strong>
                                        </div>
                                        {category.limitInCents === null ? (
                                            <div className={styles.budgetRow}>
                                                <span className={styles.muted}>Sem limite definido</span>
                                                <Link className={styles.link} href={`/budgets?period=${selectedPeriod}`}>Definir limite</Link>
                                            </div>
                                        ) : (
                                            <>
                                                <div className={styles.budgetRow}>
                                                    <span className={styles.muted}>Limite: {money(category.limitInCents)}</span>
                                                    <span className={category.status === 'OVER_LIMIT' ? styles.negative : styles.muted}>
                                                        {category.percentage ?? 0}% utilizado
                                                    </span>
                                                </div>
                                                <progress max={100} value={Math.max(0, Math.min(100, category.percentage ?? 0))}
                                                    className={styles.progress} aria-label={`Consumo do orçamento ${category.name}`} />
                                            </>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                    <Link href="/budgets" className={styles.footerLink}>Gerenciar limites e categorias <span aria-hidden="true">→</span></Link>
                </Card>
                <Card padding="lg" className={styles.card}>
                    <header className={styles.heading}><h2>Despesas fixas do mês</h2></header>
                    {fixedExpenses.length + fixedCardTransactions.length === 0 ? (
                        <div className={styles.empty}>
                            <span className={styles.emptyIcon} aria-hidden="true"><Calendar /></span>
                            <p>Nenhuma despesa fixa neste mês.</p>
                            <Link className={styles.outlineButton} href="/expenses">Adicionar despesa fixa</Link>
                        </div>
                    ) : (
                        <ul className={styles.compactList}>
                            {fixedExpenses.map(expense => (
                                <li key={expense.id}>
                                    <div><strong>{expense.description}</strong><span className={styles.muted}>
                                        {expense.date ? `Vencimento: ${dateLabel(expense.date)}` : 'Despesa fixa'}
                                    </span></div>
                                    <strong className={styles.amount}>{money(expense.amountInCents)}</strong>
                                </li>
                            ))}
                            {fixedCardTransactions.map(expense => (
                                <li key={expense.id}>
                                    <div><strong>{expense.description}</strong><span className={styles.muted}>Cartão · {dateLabel(expense.occurredAt)}</span></div>
                                    <strong className={styles.amount}>{money(expense.amountInCents)}</strong>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>
                <Card padding="lg" className={styles.card}>
                    <header className={styles.heading}>
                        <h2>Compras do cartão</h2>
                        <Link href="/cards" className={styles.link}>Ver todas <span aria-hidden="true">→</span></Link>
                    </header>
                    {cardTransactions.length === 0 ? (
                        <div className={styles.empty}>
                            <span className={styles.emptyIcon} aria-hidden="true"><CreditCard /></span>
                            <p>Nenhuma compra de cartão registrada neste mês.</p>
                            <Link className={styles.outlineButton} href="/expenses">Registrar compra</Link>
                        </div>
                    ) : (
                        <ul className={styles.compactList}>
                            {cardTransactions.map(transaction => (
                                <li key={transaction.id}>
                                    <div>
                                        <strong>{transaction.description}</strong>
                                        <span className={styles.muted}>
                                            {dateLabel(transaction.occurredAt)} · {transaction.isFixed ? 'Fixa' : 'Variável'}
                                        </span>
                                        {!transaction.isFixed && <MarkFixedButton transactionId={transaction.id} />}
                                    </div>
                                    <strong className={styles.amount}>{money(transaction.amountInCents)}</strong>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>
            </div>
        </section>
    );
}
