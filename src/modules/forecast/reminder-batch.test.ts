import { describe, expect, it } from 'vitest';
import { planReminderBatch } from './reminder-batch';

describe('reminder batch', () => {
    it('deduplicates candidates and excludes previously delivered keys', () => {
        const input = { optedIn: true, timeZone: 'UTC', userId: 'u',
            occurrenceId: 'a', dueDate: '2027-01-10', status: 'PENDING' as const };
        const now = new Date('2027-01-10T12:00:00Z');
        const first = planReminderBatch([input, input], now, new Set());
        expect(first).toHaveLength(1);
        expect(planReminderBatch([input], now, new Set([first[0].deduplicationKey]))).toEqual([]);
    });
});
