import Link from 'next/link';
import styles from './index.module.css';

export function ExpenseHistoryHeader({
    archived,
    hasArchived,
}: {
    archived: boolean;
    hasArchived: boolean;
}) {
    return (
        <header className={styles.header}>
            <h2>{archived ? 'Despesas arquivadas' : 'Histórico de despesas'}</h2>
            {(archived || hasArchived) && (
                <Link href={archived ? '/expenses' : '/expenses?view=archived'}>
                    {archived ? 'Ver despesas ativas' : 'Despesas arquivadas'}
                </Link>
            )}
        </header>
    );
}
