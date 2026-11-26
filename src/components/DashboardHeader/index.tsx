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
                <h1>Visão geral</h1>
                <p>{name ? `Olá, ${name}.` : 'Olá! :)'}</p>
                <p>Acompanhe suas finanças.</p>
            </div>
            <MonthSelector month={month} />
        </header>
    );
}
