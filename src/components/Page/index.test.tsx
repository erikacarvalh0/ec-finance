// @vitest-environment jsdom
import type { ReactNode } from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Page } from './index';
import { signOut } from 'next-auth/react';

vi.mock('next-auth/react', () => ({ signOut: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@erikacarvalho/react/Button', () => ({ Button: ({ children, action }: { children: ReactNode; action: () => void }) => <button type="button" onClick={action}>{children}</button> }));
const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ usePathname: () => '/expenses', useRouter: () => ({ push }) }));
vi.mock('@erikacarvalho/react/Header', () => ({
    Header: ({ links, footerContent, isFixed, logo, routerContext }: {
        links: { href: string; text: string; isActive: boolean; icon: ReactNode }[];
        footerContent?: ReactNode; isFixed: boolean; logo: ReactNode; routerContext: (href: string) => void;
    }) => (
        <nav aria-label="Menu principal" data-fixed={isFixed}>
            {logo}
            {links.map(item => <a key={item.href} href={item.href} onClick={event => { event.preventDefault(); routerContext(item.href); }} aria-current={item.isActive ? 'page' : undefined}>{item.icon}{item.text}</a>)}
            {footerContent}
        </nav>
    ),
}));
afterEach(cleanup);

describe('Page', () => {
    it('renders one fixed Header and places children inside main', () => {
        render(<Page><h1>Despesas</h1></Page>);
        expect(screen.getAllByRole('navigation')).toHaveLength(1);
        expect(screen.getByRole('navigation').getAttribute('data-fixed')).toBe('true');
        expect(screen.getByText('ec finance.')).toBeTruthy();
        expect(within(screen.getByRole('navigation')).getByRole('button', { name: 'Sair' })).toBeTruthy();
        expect(screen.getByRole('link', { name: 'Despesas' }).getAttribute('aria-current')).toBe('page');
        expect(within(screen.getByRole('main')).getByRole('heading', { name: 'Despesas' })).toBeTruthy();
    });
    it('navigates using the Next router', () => {
        render(<Page>Conteúdo</Page>);
        fireEvent.click(screen.getByRole('link', { name: 'Entradas' }));
        expect(push).toHaveBeenCalledWith('/incomes');
    });
    it('signs out from the shared footer', async () => {
        render(<Page>Conteúdo</Page>);
        fireEvent.click(screen.getByRole('button', { name: 'Sair' }));
        await waitFor(() => expect(signOut).toHaveBeenCalledWith({ redirectTo: '/sign-in' }));
    });
});
