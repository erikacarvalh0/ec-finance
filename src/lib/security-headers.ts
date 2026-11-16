/**
 * Baseline headers for every route, including private financial pages and APIs.
 * CSP is intentionally deferred until OAuth and external asset origins are audited.
 */
export const securityHeaders = [
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
] as const;
