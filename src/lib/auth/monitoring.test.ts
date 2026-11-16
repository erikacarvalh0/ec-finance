import { afterEach, describe, expect, it, vi } from 'vitest';
import { logAuthFailure, withAuthMonitoring } from './monitoring';

afterEach(() => vi.restoreAllMocks());

describe('authentication failure monitoring', () => {
    it('correlates concurrent failures without logging request or exception data', async () => {
        const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
        const handler = withAuthMonitoring(async () => {
            await Promise.resolve();
            logAuthFailure();
            const headers = new Headers({ Location: '/sign-in' });
            headers.append('Set-Cookie', 'session=secret-token; HttpOnly; Secure');
            headers.append('Set-Cookie', 'state=secret-state; HttpOnly; Secure');
            return new Response(null, { status: 302, headers });
        });
        const responses = await Promise.all([1, 2].map(() => handler(new Request(
            'https://example.com/api/auth/callback/google?code=secret-token',
            { headers: { authorization: 'Bearer secret-token', 'x-correlation-id': 'bank-account' } },
        ))));
        const ids = responses.map((response) => response.headers.get('x-correlation-id'));

        expect(new Set(ids).size).toBe(2);
        expect(errorLog).toHaveBeenCalledTimes(2);
        for (const [index, response] of responses.entries()) {
            expect(response.status).toBe(302);
            expect(response.headers.get('Location')).toBe('/sign-in');
            expect(response.headers.getSetCookie()).toEqual([
                'session=secret-token; HttpOnly; Secure',
                'state=secret-state; HttpOnly; Secure',
            ]);
            expect(ids[index]).toMatch(/^[0-9a-f-]{36}$/);
        }
        expect(errorLog.mock.calls.map(([line]) => JSON.parse(line))).toEqual(
            ids.map((correlationId) => ({ level: 'error', event: 'auth.failure', correlationId })),
        );
    });

    it('logs thrown failures and returns a generic correlated response', async () => {
        const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
        const handler = withAuthMonitoring(async () => {
            throw new Error('token=secret-token account=123456 balance=999');
        });

        const response = await handler(new Request('https://example.com/api/auth/session'));

        expect(response.status).toBe(500);
        expect(response.headers.get('Cache-Control')).toBe('no-store');
        expect(await response.json()).toEqual({ error: 'Authentication unavailable' });
        expect(errorLog).toHaveBeenCalledExactlyOnceWith(JSON.stringify({
            level: 'error', event: 'auth.failure',
            correlationId: response.headers.get('x-correlation-id'),
        }));
    });

    it('does not log successful requests and supports failures outside an HTTP request', async () => {
        const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
        await withAuthMonitoring(async () => new Response('{}'))(new Request('https://example.com'));
        expect(errorLog).not.toHaveBeenCalled();

        logAuthFailure();

        expect(JSON.parse(errorLog.mock.calls[0][0])).toEqual({
            level: 'error', event: 'auth.failure', correlationId: expect.stringMatching(/^[0-9a-f-]{36}$/),
        });
    });
});
