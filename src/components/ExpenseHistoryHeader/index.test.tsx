// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { ExpenseHistoryHeader } from './index';

afterEach(cleanup);

it('hides the archive link when no archived expenses exist', () => {
    render(<ExpenseHistoryHeader archived={false} hasArchived={false} />);
    expect(screen.queryByRole('link')).toBeNull();
});

it('shows the archive link when archived expenses exist', () => {
    render(<ExpenseHistoryHeader archived={false} hasArchived />);
    expect(screen.getByRole('link').getAttribute('href')).toBe('/expenses?view=archived');
});

it('always offers a return from the archive view', () => {
    render(<ExpenseHistoryHeader archived hasArchived={false} />);
    expect(screen.getByRole('link').getAttribute('href')).toBe('/expenses');
});
