import { describe, expect, it } from 'vitest';
import { checkReadiness } from './readiness';

describe('readiness', () => {
    it('returns 200 when the database responds', async () => {
        expect(await checkReadiness(async () => {})).toEqual({ status: 200, ready: true });
    });
    it('does not expose database errors', async () => {
        expect(await checkReadiness(async () => { throw new Error('secret'); })).toEqual({ status: 503, ready: false });
    });
});
