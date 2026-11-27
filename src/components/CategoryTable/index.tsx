import { Button } from '@erikacarvalho/react/Button';
import type { ManagedCategory } from '@/modules/categories/management';
import styles from './index.module.css';

const symbols: Record<string, string> = {
    'shopping-cart': '🛒', house: '⌂', 'car-front': '🚗', heart: '♥',
    ellipsis: '…', wallet: '▣', briefcase: '▰', 'trending-up': '↗', 'arrow-left-right': '↔',
};

function ActionIcon({ kind }: { kind: 'up' | 'down' | 'edit' | 'delete' }) {
    return (
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            {kind === 'up' && <path d="M12 19V5m-6 6 6-6 6 6" />}
            {kind === 'down' && <path d="M12 5v14m-6-6 6 6 6-6" />}
            {kind === 'edit' && <path d="m15 5 4 4M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15z" />}
            {kind === 'delete' && <path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7" />}
        </svg>
    );
}

export function CategoryTable({ rows, busy, move, edit, remove }: {
    rows: ManagedCategory[];
    busy: boolean;
    move: (index: number, offset: number) => void;
    edit: (row: ManagedCategory) => void;
    remove: (row: ManagedCategory) => void;
}) {
    const iconClass = styles['category-table__action'];

    return (
        <div className={styles['category-table']}>
            <table className={styles['category-table__table']}>
                <thead>
                    <tr>
                        <th scope="col">Ordem</th>
                        <th scope="col">Categoria</th>
                        <th scope="col">Cor</th>
                        <th scope="col">Ações</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, index) => (
                        <tr key={row.id}>
                            <td>
                                <div className={styles['category-table__actions']}>
                                    <Button type="button" theme="neutral" customClass={iconClass}
                                        isDisabled={busy || index === 0} action={() => move(index, -1)}>
                                        <ActionIcon kind="up" />
                                        <span className={styles['category-table__sr']}>Subir {row.name}</span>
                                    </Button>
                                    <Button type="button" theme="neutral" customClass={iconClass}
                                        isDisabled={busy || index === rows.length - 1} action={() => move(index, 1)}>
                                        <ActionIcon kind="down" />
                                        <span className={styles['category-table__sr']}>Descer {row.name}</span>
                                    </Button>
                                </div>
                            </td>
                            <td>
                                <span className={styles['category-table__symbol']}
                                    style={{ backgroundColor: row.iconBackground, color: row.color }}
                                    aria-hidden="true">{symbols[row.icon] ?? '…'}</span> {row.name}
                            </td>
                            <td>
                                <span className={styles['category-table__dot']} style={{ backgroundColor: row.color }} aria-hidden="true" />
                                <span className={styles['category-table__sr']}>{row.color}</span>
                            </td>
                            <td>
                                <div className={styles['category-table__actions']}>
                                    <Button type="button" theme="neutral" customClass={iconClass}
                                        isDisabled={busy} action={() => edit(row)}>
                                        <ActionIcon kind="edit" />
                                        <span className={styles['category-table__sr']}>Editar {row.name}</span>
                                    </Button>
                                    <Button type="button" theme="cancel"
                                        customClass={`${iconClass} ${styles['category-table__action--delete']}`}
                                        isDisabled={busy} action={() => remove(row)}>
                                        <ActionIcon kind="delete" />
                                        <span className={styles['category-table__sr']}>Excluir {row.name}</span>
                                    </Button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {rows.length === 0 && <p>Nenhuma categoria cadastrada.</p>}
        </div>
    );
}
