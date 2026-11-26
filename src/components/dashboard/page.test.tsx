// @vitest-environment jsdom
import type { ReactNode } from 'react';
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Page } from './page';

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
        expect(screen.getByRole('link', { name: 'Despesas' }).getAttribute('aria-current')).toBe('page');
        expect(within(screen.getByRole('main')).getByRole('heading', { name: 'Despesas' })).toBeTruthy();
    });
});
