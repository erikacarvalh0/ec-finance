'use client';

import { Card } from '@erikacarvalho/react/Card';
import dashboardStyles from '@/components/DashboardLayout/index.module.css';
import styles from './index.module.css';
import type { ReactNode } from 'react';

type MetricCardProps = {
    title: string;
    value: string;
    icon: ReactNode;
    children?: ReactNode;
    alignContent?: 'top-centered';
    variant?: 'upper' | 'lower';
};

export function MetricCard({ title, value, icon, children, variant = 'upper', alignContent }: MetricCardProps) {
    return (
        <Card customClass={`${dashboardStyles.card} ${styles.card} ${styles[variant]} ${alignContent === 'top-centered' ? styles['metric-card--top-centered'] : ''}`}>
            <div className={styles.row}>
                <span className={styles.icon} aria-hidden="true">{icon}</span>
                <div className={styles.content}>
                    <h2 className={styles.label}>{title}</h2>
                    <strong className={styles.value}>{value}</strong>
                    {children}
                </div>
            </div>
        </Card>
    );
}
