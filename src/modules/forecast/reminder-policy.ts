type ReminderInput = {
    optedIn: boolean;
    timeZone: string;
    userId: string;
    occurrenceId: string;
    dueDate: string;
    status: 'PENDING' | 'SETTLED' | 'CANCELED';
};

export function planDueReminder(input: ReminderInput, now: Date) {
    if (!input.optedIn || input.status !== 'PENDING') return null;
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: input.timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(now);
    const part = (type: string) => parts.find(item => item.type === type)?.value;
    const date = `${part('year')}-${part('month')}-${part('day')}`;
    if (date !== input.dueDate) return null;
    return { deduplicationKey: JSON.stringify([input.userId, input.occurrenceId, date]) };
}
