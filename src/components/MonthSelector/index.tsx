'use client';

import { useRouter } from 'next/navigation';
import styles from './index.module.css';

export function MonthSelector({ month }: { month: string }) {
    const router = useRouter();

    const formattedMonth = new Intl.DateTimeFormat('pt-BR', {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
    }).format(new Date(`${month}-01T00:00:00Z`));

    return (
        <label className={styles['month-selector']}>
            <span className={styles['month-selector__label']}>Mês</span>
            <span className={styles['month-selector__value']} aria-hidden="true">{formattedMonth}</span>
            <span className={styles['month-selector__chevron']} aria-hidden="true" />
            <input
                className={styles['month-selector__input']}
                lang="pt-BR"
                type="month"
                value={month}
                onChange={event => {
                    if (/^[1-9]\d{3}-(0[1-9]|1[0-2])$/.test(event.target.value)) {
                        router.push('/?month=' + event.target.value);
                    }
                }}
            />
        </label>
    );
}
