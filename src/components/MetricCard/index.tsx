'use client';

import { Card } from '@erikacarvalho/react/Card';
import type { ReactNode } from 'react';

type MetricCardProps = {
    title: string;
    value: string;
    icon: ReactNode;
    children?: ReactNode;
};

export function MetricCard({ title, value, icon, children }: MetricCardProps) {
    return (
        <Card>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <span aria-hidden="true">{icon}</span>
                <div>
                    <h2>{title}</h2>
                    <strong className="metric">{value}</strong>
                    {children}
                </div>
            </div>
        </Card>
    );
}
