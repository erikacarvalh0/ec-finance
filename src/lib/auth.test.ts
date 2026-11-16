import { afterEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ nextAuth: vi.fn((_config: unknown) => ({})) }));
vi.mock('next-auth', () => ({ default: mocks.nextAuth }));
vi.mock('next-auth/providers/google', () => ({ default: {} }));
vi.mock('@auth/prisma-adapter', () => ({ PrismaAdapter: vi.fn() }));
vi.mock('@/lib/prisma', () => ({ prisma: {} }));

afterEach(() => vi.restoreAllMocks());

it('replaces the Auth.js error logger without forwarding sensitive error details', async () => {
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
    await import('./auth');
    const config = mocks.nextAuth.mock.calls[0][0] as {
        logger: { error: (error: Error) => void };
    };
    const error = Object.assign(new Error('bank-account=123 token=secret'), {
        cause: { access_token: 'secret', balance: '999' },
    });

    config.logger.error(error);

    expect(errorLog).toHaveBeenCalledTimes(1);
    expect(JSON.parse(errorLog.mock.calls[0][0])).toEqual({
        level: 'error', event: 'auth.failure', correlationId: expect.stringMatching(/^[0-9a-f-]{36}$/),
    });
});
