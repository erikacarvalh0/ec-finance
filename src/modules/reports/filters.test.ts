import { describe, expect, it } from 'vitest';
import { parseReportMonthRange } from './filters';

describe('report month filters', () => {
    it('defaults to six months ending in the current UTC month', () => {
        expect(parseReportMonthRange({}, new Date('2026-11-16T12:00:00Z'))).toEqual({
            from: new Date('2026-06-01T00:00:00.000Z'),
            count: 6, lastPeriod: '2026-11',
        });
    });
    it('accepts a custom inclusive month range', () => {
        expect(parseReportMonthRange({ from: '2026-02', to: '2026-04' }, new Date('2026-11-16T12:00:00Z'))).toEqual({
            from: new Date('2026-02-01T00:00:00.000Z'),
            count: 3, lastPeriod: '2026-04',
        });
    });
    it('rejects invalid, reversed and oversized ranges', () => {
        for (const filter of [
            { from: '2026-12', to: '2026-11' },
            { from: '2025-01', to: '2026-11' },
            { from: '2026-13', to: '2026-11' },
            { from: '2026-01' },
        ]) {
            expect(() => parseReportMonthRange(filter, new Date('2026-11-16T12:00:00Z'))).toThrow('Invalid reporting month range');
        }
    });
});
