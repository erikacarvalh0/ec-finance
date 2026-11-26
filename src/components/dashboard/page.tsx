import type { ReactNode } from 'react';
import { DashboardSidebar } from './dashboard-shell';

export function Page({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
    return (
        <div className="layout">
            <DashboardSidebar footer={footer} />
            <main>{children}</main>
        </div>
    );
}
