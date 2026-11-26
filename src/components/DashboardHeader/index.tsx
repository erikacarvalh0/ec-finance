import { MonthSelector } from '../MonthSelector';
import styles from './index.module.css';

type DashboardHeaderProps = {
    name?: string | null;
    month: string;
};

export function DashboardHeader({ name, month }: DashboardHeaderProps) {
    return (
        <header className={styles.header}>
            <div>
                <h1 className={styles.title}>Visão geral</h1>
                <p className={styles.greeting}>{name ? `Olá, ${name}.` : 'Olá! :)'}</p>
                <p className={styles.support}>Acompanhe suas finanças.</p>
            </div>
            <MonthSelector month={month} />
        </header>
    );
}
