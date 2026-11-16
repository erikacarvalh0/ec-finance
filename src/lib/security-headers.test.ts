import { describe, expect, it } from 'vitest';
import { securityHeaders } from './security-headers';

describe('HTTP security headers', () => {
    it('blocks MIME sniffing and cross-origin framing', () => {
        const headers = Object.fromEntries(securityHeaders.map(({ key, value }) => [key, value]));
        expect(headers['X-Content-Type-Options']).toBe('nosniff');
        expect(headers['X-Frame-Options']).toBe('DENY');
        expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
        expect(headers['Permissions-Policy']).toContain('camera=()');
    });

    it('does not impose a speculative CSP on OAuth or design-system resources', () => {
        expect(securityHeaders.some(({ key }) => key === 'Content-Security-Policy')).toBe(false);
    });
});
