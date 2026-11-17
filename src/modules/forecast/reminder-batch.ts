import { planDueReminder } from './reminder-policy';

type Candidate = Parameters<typeof planDueReminder>[0];

export function planReminderBatch(
    candidates: Candidate[],
    now: Date,
    previouslyDelivered: ReadonlySet<string>,
) {
    const seen = new Set(previouslyDelivered);
    const planned: Array<{ candidate: Candidate; deduplicationKey: string }> = [];
    for (const candidate of candidates) {
        const reminder = planDueReminder(candidate, now);
        if (!reminder || seen.has(reminder.deduplicationKey)) continue;
        seen.add(reminder.deduplicationKey);
        planned.push({ candidate, ...reminder });
    }
    return planned;
}
