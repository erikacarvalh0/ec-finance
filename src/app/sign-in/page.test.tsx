import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import SignInPage from './page';

vi.mock('@/lib/auth', () => ({ auth: vi.fn(), signIn: vi.fn() }));
vi.mock('next/navigation', () => ({ redirect: vi.fn() }));
vi.mock('@/components/ecds-v1/compat', () => ({
    Button: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
    Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('sign-in page', () => {
    beforeEach(() => {
        vi.mocked(auth).mockResolvedValue(null as never);
    });

    async function renderPage(error?: string | string[]) {
        return renderToStaticMarkup(await SignInPage({
            searchParams: Promise.resolve({ error }),
        }));
    }

    it('shows no error on an initial visit', async () => {
        expect(await renderPage()).not.toContain('role="alert"');
    });

    it('explains how to recover when an account is not linked', async () => {
        const html = await renderPage('OAuthAccountNotLinked');

        expect(html).toContain('role="alert"');
        expect(html).toContain('sign in with the same account you used originally');
    });

    it.each([
        { error: 'AccessDenied' },
        { error: 'OAuthCallbackError' },
        { error: '<script>private details</script>' },
        { error: ['AccessDenied', 'other'] },
    ])(
        'shows a generic message for error $error without exposing its value',
        async ({ error }) => {
            const html = await renderPage(error);

            expect(html).toContain('Unable to sign in. Please try again.');
            expect(html).not.toContain('private details');
        },
    );

    it('still redirects an authenticated user', async () => {
        vi.mocked(auth).mockResolvedValue({ user: { id: 'owner-123' } } as never);
        vi.mocked(redirect).mockImplementationOnce(() => { throw new Error('redirect'); });

        await expect(renderPage('AccessDenied')).rejects.toThrow('redirect');
        expect(redirect).toHaveBeenCalledWith('/');
    });
});
