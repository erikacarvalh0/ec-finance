import { Button } from '@/components/ecds-v1/compat';
import Link from 'next/link';
import type { ReactNode } from 'react';
import type { HistoryQuery } from '@/modules/income/paged-history';
import styles from './index.module.css';

export type IncomeHistoryRow = { id: string; date: string; description: string; type: string; category: string; amount: string; actions: ReactNode };

export function IncomeHistory({ filters, categories, rows, page, pages }: {
    filters: HistoryQuery;
    categories: Array<{ id: string; name: string }>;
    rows: IncomeHistoryRow[];
    page: number;
    pages: number;
}) {
    function href(target: number) {
        const query = new URLSearchParams();
        for (const key of ['type', 'search', 'month', 'categoryId'] as const) {
            const value = filters[key];
            if (value) query.set(key, value);
        }
        if (filters.archived) query.set('view', 'archived');
        query.set('page', String(target));
        return '/incomes?' + query.toString();
    }
    const first = Math.max(1, Math.min(page - 2, pages - 4));
    return (
        <section className={styles['income-history']} aria-labelledby="income-history-title">
            <header>
                <h2 id="income-history-title">Histórico de entradas</h2>
                <Link href={filters.archived ? '/incomes' : '/incomes?view=archived'}>{filters.archived ? 'Ver entradas ativas' : 'Ver entradas arquivadas'}</Link>
            </header>
            <form action="/incomes" className={styles['income-history__filters']}>
                {filters.archived && <input type="hidden" name="view" value="archived" />}
                <label>Mês<input type="month" name="month" defaultValue={filters.month ?? ''} /></label>
                <label>Tipo<select name="type" defaultValue={filters.type ?? ''}><option value="">Todos</option><option value="SALARY">Salário</option><option value="RECURRING">Recorrente</option><option value="OTHER">Eventual</option></select></label>
                <label>Categoria<select name="categoryId" defaultValue={filters.categoryId ?? ''}><option value="">Todas</option>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
                <label className={styles['income-history__search']}><span>Buscar</span><input name="search" type="search" maxLength={100} defaultValue={filters.search ?? ''} placeholder="Responsável ou descrição" /><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/></svg></label>
                <Button type="submit">Aplicar filtros</Button>
            </form>
            {rows.length ? <div className={styles['income-history__scroll']}><table>
                <thead><tr>{['Data', 'Descrição', 'Tipo', 'Categoria', 'Valor', 'Ações'].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead>
                <tbody>{rows.map(row => <tr key={row.id}><td>{row.date}</td><td>{row.description}</td><td>{row.type}</td><td><small>{row.category}</small></td><td>{row.amount}</td><td>{row.actions}</td></tr>)}</tbody>
            </table></div> : <p>Nenhuma entrada registrada.</p>}
            {pages > 1 && <nav aria-label="Paginação de entradas" className={styles['income-history__pagination']}>
                {page > 1 && <Link href={href(page - 1)}>Anterior</Link>}
                {Array.from({ length: Math.min(5, pages) }, (_, index) => first + index).map(number => <Link key={number} href={href(number)} aria-current={number === page ? 'page' : undefined}>{number}</Link>)}
                {page < pages && <Link href={href(page + 1)}>Próxima</Link>}
            </nav>}
        </section>
    );
}
