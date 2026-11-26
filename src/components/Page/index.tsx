'use client';
import type { ReactNode } from 'react';
import { Button } from '@/components/ecds-v1/compat';
import { signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';
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

export function Page({ children }: { children: ReactNode }) {
    const pathname = usePathname() ?? '';
    const items = navigation.map(({ Icon, href, label }) => ({
        href, label, icon: <Icon />,
        active: href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/'),
    }));
    return (
        <div className="layout">
            <Sidebar brand={<span>ec finance.</span>} navigationLabel="Menu principal" items={items} footer={(
                <form onSubmit={async (event) => {
                    event.preventDefault();
                    await signOut({ redirectTo: '/sign-in' });
                }}>
                    <Button type="submit" variant="ghost">Sair</Button>
                </form>
            )} />
            <main>{children}</main>
        </div>
    );
}
