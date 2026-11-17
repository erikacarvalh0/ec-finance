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

export function productionSecurityHeaders(production: boolean) {
    return production ? [
        { key: 'Strict-Transport-Security', value: 'max-age=31536000' },
        { key: 'Content-Security-Policy-Report-Only', value: "default-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self' https://accounts.google.com; script-src 'self'; style-src 'self'" },
    ] : [];
}
