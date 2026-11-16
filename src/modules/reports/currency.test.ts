import { describe, expect, it } from 'vitest';
import { formatReportCurrency } from './currency';

describe('report currency formatting', () => {
    it.each([
        ['0', 'R$ 0,00'],
        ['123456', 'R$ 1.234,56'],
        ['90071992547409931', 'R$ 900.719.925.474.099,31'],
        ['-90071992547409931', '-R$ 900.719.925.474.099,31'],
        ['-1', '-R$ 0,01'],
    ])('formats %s cents without rounding', (cents, expected) => {
        expect(formatReportCurrency(BigInt(cents))).toBe(expected);
    });
});
