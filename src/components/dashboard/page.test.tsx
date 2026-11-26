// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Page } from './page';

vi.mock('next/navigation', () => ({ usePathname: () => '/expenses' }));
vi.mock('./dashboard-shell', () => ({ DashboardSidebar: () => <nav aria-label="Menu principal" /> }));
afterEach(cleanup);

describe('Page', () => {
    it('renders one sidebar and places children inside main', () => {
        render(<Page><h1>Despesas</h1></Page>);
        expect(screen.getAllByRole('navigation')).toHaveLength(1);
        expect(within(screen.getByRole('main')).getByRole('heading', { name: 'Despesas' })).toBeTruthy();
    });
});
