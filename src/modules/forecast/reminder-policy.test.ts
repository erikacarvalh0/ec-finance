import { describe, expect, it } from 'vitest';
import { planDueReminder } from './reminder-policy';

describe('due reminder policy', () => {
    const input = { optedIn: true, timeZone: 'America/Sao_Paulo', userId: 'u',
        occurrenceId: 'e', dueDate: '2027-01-10', status: 'PENDING' as const };
    it('uses the local calendar day, not UTC midnight', () => {
        expect(planDueReminder(input, new Date('2027-01-10T01:00:00Z'))).toBeNull();
        expect(planDueReminder(input, new Date('2027-01-10T04:00:00Z'))).not.toBeNull();
    });
    it('does not notify opted-out or settled users', () => {
        const now = new Date('2027-01-10T12:00:00Z');
        expect(planDueReminder({ ...input, optedIn: false }, now)).toBeNull();
        expect(planDueReminder({ ...input, status: 'SETTLED' }, now)).toBeNull();
    });
});
