import type { ReactNode } from 'react';
import { Card } from '@/components/ecds-v1/compat';

export interface MetricCardProps {
    label: string;
    value: string;
    description?: string;
    icon?: ReactNode;
}

export function MetricCard({ label, value, description, icon }: MetricCardProps) {
    return (
        <Card padding="lg">
            <h2>{label}</h2>
            {icon && <span aria-hidden="true">{icon}</span>}
            <p className="metric">{value}</p>
            {description && <p>{description}</p>}
        </Card>
    );
}
