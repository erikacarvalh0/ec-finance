import { calculateNetWorth, type NetWorthBalances } from './net-worth';

type Snapshot = NetWorthBalances & { recordedAt: Date };

export function summarizeNetWorthHistory(snapshots: Snapshot[]) {
    const latest = new Map<string, Snapshot>();
    for (const snapshot of snapshots) {
        if (!Number.isFinite(snapshot.recordedAt.getTime())) {
            throw new Error('Invalid net worth snapshot date');
        }
        const period = snapshot.recordedAt.toISOString().slice(0, 7);
        const previous = latest.get(period);
        if (!previous || snapshot.recordedAt > previous.recordedAt) {
            latest.set(period, snapshot);
        }
    }
    return Array.from(latest.entries()).sort(([a], [b]) => a.localeCompare(b))
        .map(([period, snapshot]) => ({
            period,
            recordedAt: snapshot.recordedAt,
            ...calculateNetWorth(snapshot),
        }));
}
