import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';

const correlation = new AsyncLocalStorage<string>();

// Keep this allowlist fixed: Auth.js errors can contain tokens and adapter data.
export function logAuthFailure(): void {
    console.error(JSON.stringify({
        level: 'error',
        event: 'auth.failure',
        correlationId: correlation.getStore() ?? randomUUID(),
    }));
}

export function withAuthMonitoring(handler: (request: Request) => Promise<Response>) {
    return (request: Request): Promise<Response> => {
        const correlationId = randomUUID();

        return correlation.run(correlationId, async () => {
            let response: Response;
            try {
                response = await handler(request);
            } catch {
                logAuthFailure();
                response = Response.json({ error: 'Authentication unavailable' }, {
                    status: 500,
                    headers: { 'Cache-Control': 'no-store' },
                });
            }

            const headers = new Headers(response.headers);
            headers.set('x-correlation-id', correlationId);
            return new Response(response.body, {
                status: response.status,
                statusText: response.statusText,
                headers,
            });
        });
    };
}
