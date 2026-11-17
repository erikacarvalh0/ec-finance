import { describe, expect, it } from 'vitest';
import { productionSecurityHeaders, securityHeaders } from './security-headers';

describe('HTTP security headers', () => {
    it('blocks MIME sniffing and cross-origin framing', () => {
        const headers = Object.fromEntries(securityHeaders.map(({ key, value }) => [key, value]));
        expect(headers['X-Content-Type-Options']).toBe('nosniff');
        expect(headers['X-Frame-Options']).toBe('DENY');
        expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
        expect(headers['Permissions-Policy']).toContain('camera=()');
    });

    it('does not impose a speculative CSP on OAuth or design-system resources', () => {
        expect(Object.keys(Object.fromEntries(securityHeaders.map(({ key, value }) => [key, value])))).not.toContain('Content-Security-Policy');
    });
    it('adds HSTS and report-only CSP only for production', () => {
        expect(productionSecurityHeaders(false)).toEqual([]);
        expect(productionSecurityHeaders(true).map(header => header.key)).toEqual([
            'Strict-Transport-Security', 'Content-Security-Policy-Report-Only',
        ]);
    });
});
