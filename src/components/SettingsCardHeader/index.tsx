import type { ReactNode } from 'react';
import styles from './index.module.css';

export function SettingsCardHeader({ id, title, description, icon }: {
    id: string;
    title: string;
    description: string;
    icon: ReactNode;
}) {
    return (
        <header className={styles.header}>
            <span className={styles.icon} aria-hidden="true">{icon}</span>
            <div>
                <h2 id={id}>{title}</h2>
                <p>{description}</p>
            </div>
        </header>
    );
}
