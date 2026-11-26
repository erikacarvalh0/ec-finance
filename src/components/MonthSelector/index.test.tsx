// @vitest-environment jsdom
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { afterEach, it, expect, vi } from 'vitest';
import { MonthSelector } from './index';

const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push }),
}));

afterEach(cleanup);

it('navigates to selected month', () => {
    render(<MonthSelector month="2026-11" />);
    fireEvent.change(screen.getByLabelText('Período'), {
        target: { value: '2026-10' },
    });
    expect(push).toHaveBeenCalledWith('/?month=2026-10');
});
