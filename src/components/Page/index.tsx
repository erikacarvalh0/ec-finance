'use client';
import type { ReactNode } from 'react';
import { Button } from '@erikacarvalho/react/Button';
import { signOut } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import { Header } from '@erikacarvalho/react/Header';
import { Dashboard, Wallet, ArrowDown, ArrowUp, ChartBar, Calendar, CreditCard, Target, Logout, User } from '@erikacarvalho/react/Icons';

const navigation = [
    { href: '/', label: 'Visão geral', Icon: Dashboard },
    { href: '/expenses', label: 'Despesas', Icon: ArrowDown },
    { href: '/incomes', label: 'Entradas', Icon: ArrowUp },
    { href: '/investments', label: 'Investimentos', Icon: Wallet },
    { href: '/forecast', label: 'Planejamento', Icon: Calendar },
    { href: '/cards', label: 'Cartões e faturas', Icon: CreditCard },
    { href: '/budgets', label: 'Orçamentos', Icon: Target },
    { href: '/reports', label: 'Relatórios', Icon: ChartBar },
    { href: '/settings', label: 'Configurações', Icon: User },
];

export function Page({ children, mainClassName }: { children: ReactNode; mainClassName?: string }) {
    const pathname = usePathname() ?? '';
    const router = useRouter();
    const items = navigation.map(({ Icon, href, label }) => ({
        href, text: label, icon: <Icon />,
        isActive: href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/'),
    }));
    return (
        <div className="layout">
            <Header
                isFixed
                title="EC Finance"
                logo={<span>ec finance.</span>}
                logoHref="/"
                links={items}
                routerContext={(href: string) => router.push(href)}
                footerContent={
                    <Button theme="neutral" type="button" action={() => { void signOut({ redirectTo: '/sign-in' }); }}>
                        <Logout aria-hidden="true" /> Sair
                    </Button>
                }
            />
            <main className={mainClassName}>{children}</main>
        </div>
    );
}
