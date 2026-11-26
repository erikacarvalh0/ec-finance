import type { ReactNode } from 'react';
import { Card } from '@erikacarvalho/react/Card';
import { SettingsCardHeader } from '../SettingsCardHeader';
import styles from './index.module.css';

export function SettingsCard({ id, title, description, icon, children }: {
    id: string;
    title: string;
    description: string;
    icon: ReactNode;
    children: ReactNode;
}) {
    return (
        <section aria-labelledby={id} className={styles.section}>
            <Card customClass={styles.card}>
                <SettingsCardHeader id={id} title={title} description={description} icon={icon} />
                <div className={styles.body}>{children}</div>
            </Card>
        </section>
    );
}
