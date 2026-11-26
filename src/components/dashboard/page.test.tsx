// @vitest-environment jsdom
import type { ReactNode } from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Page } from './page';
import { signOut } from 'next-auth/react';

vi.mock('next-auth/react', () => ({ signOut: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/components/ecds-v1/compat', () => ({ Button: ({ children }: { children: ReactNode }) => <button type="submit">{children}</button> }));
vi.mock('next/navigation', () => ({ usePathname: () => '/expenses' }));
vi.mock('@erikacarvalho/react/Sidebar', () => ({
    Sidebar: ({ items, footer }: { items: { href: string; label: string; active: boolean }[]; footer?: ReactNode }) => (
        <nav aria-label="Menu principal">
            {items.map(item => <a key={item.href} href={item.href} aria-current={item.active ? 'page' : undefined}>{item.label}</a>)}
            {footer}
        </nav>
    ),
}));
afterEach(cleanup);

describe('Page', () => {
    it('renders one sidebar and places children inside main', () => {
        render(<Page><h1>Despesas</h1></Page>);
        expect(screen.getAllByRole('navigation')).toHaveLength(1);
        expect(within(screen.getByRole('navigation')).getByRole('button', { name: 'Sair' })).toBeTruthy();
        expect(screen.getByRole('link', { name: 'Despesas' }).getAttribute('aria-current')).toBe('page');
        expect(within(screen.getByRole('main')).getByRole('heading', { name: 'Despesas' })).toBeTruthy();
    });
    it('signs out from the shared footer', async () => {
        render(<Page>Conteúdo</Page>);
        fireEvent.click(screen.getByRole('button', { name: 'Sair' }));
        await waitFor(() => expect(signOut).toHaveBeenCalledWith({ redirectTo: '/sign-in' }));
    });
});
