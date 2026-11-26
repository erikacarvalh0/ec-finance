'use client';
import type { ReactNode } from 'react';
import { Sidebar } from '@erikacarvalho/react/Sidebar';
import { Dashboard, Wallet, ArrowDown, ArrowUp, ChartBar, Calendar, CreditCard, Target } from '@erikacarvalho/react/Icons';

const navigation = [
    { href: '/', label: 'Visão geral', Icon: Dashboard },
    { href: '/expenses', label: 'Despesas', Icon: ArrowDown },
    { href: '/incomes', label: 'Entradas', Icon: ArrowUp },
    { href: '/investments', label: 'Investimentos', Icon: Wallet },
    { href: '/forecast', label: 'Planejamento', Icon: Calendar },
    { href: '/cards', label: 'Cartões e faturas', Icon: CreditCard },
    { href: '/budgets', label: 'Orçamentos', Icon: Target },
    { href: '/reports', label: 'Relatórios', Icon: ChartBar },
];

export function DashboardShell({ children, pathname, footer }: {
    children: ReactNode;
    pathname: string;
    footer?: ReactNode;
}) {
    const items = navigation.map(({ Icon, href, label }) => ({
        href, label, icon: <Icon />,
        active: href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/'),
    }));
    return (
        <div className="layout">
            <Sidebar brand={<span>ec finance.</span>} navigationLabel="Menu principal" items={items} footer={footer} />
            <main>{children}</main>
        </div>
    );
}
