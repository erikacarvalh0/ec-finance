import { beforeEach, describe, expect, it, vi } from 'vitest';
import { correctInvestmentSnapshot, deleteInvestmentSnapshot } from './snapshot-corrections';

const findInvestment = vi.fn();
const findSnapshot = vi.fn();
const updateSnapshot = vi.fn();
const removeSnapshot = vi.fn();
const db = {
    investment: { findFirst: findInvestment },
    investmentSnapshot: {
        findFirst: findSnapshot,
        update: updateSnapshot,
        delete: removeSnapshot,
    },
} as unknown as Parameters<typeof correctInvestmentSnapshot>[0];

describe('investment snapshot corrections', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        findInvestment.mockResolvedValue({ id: 'investment-a' });
        findSnapshot.mockResolvedValue({ id: 'snapshot-a' });
    });

    it('corrects the amount and date only for the authenticated investment owner', async () => {
        await correctInvestmentSnapshot(db, 'owner-a', 'investment-a', 'snapshot-a', {
            amountInCents: '250050',
            recordedAt: '2026-11-15',
        });

        expect(findInvestment).toHaveBeenCalledWith({
            where: { id: 'investment-a', userId: 'owner-a' },
            select: { id: true },
        });
        expect(findSnapshot).toHaveBeenCalledWith({
            where: {
                id: 'snapshot-a', investmentId: 'investment-a', userId: 'owner-a',
            },
            select: { id: true },
        });
        expect(updateSnapshot).toHaveBeenCalledWith({
            where: { id: 'snapshot-a' },
            data: {
                amountInCents: BigInt(250050),
                recordedAt: new Date('2026-11-15T00:00:00.000Z'),
            },
        });
    });

    it('rejects foreign investments and never writes', async () => {
        findInvestment.mockResolvedValue(null);

        await expect(correctInvestmentSnapshot(db, 'owner-a', 'foreign', 'snapshot-a', {
            amountInCents: '1', recordedAt: '2026-11-15',
        })).rejects.toThrow('Investment not found');

        expect(updateSnapshot).not.toHaveBeenCalled();
    });

    it('rejects snapshots belonging to another investment', async () => {
        findSnapshot.mockResolvedValue(null);

        await expect(deleteInvestmentSnapshot(db, 'owner-a', 'investment-a', 'foreign-snapshot'))
            .rejects.toThrow('Snapshot not found');

        expect(removeSnapshot).not.toHaveBeenCalled();
    });

    it('deletes only a verified owned snapshot', async () => {
        await deleteInvestmentSnapshot(db, 'owner-a', 'investment-a', 'snapshot-a');

        expect(removeSnapshot).toHaveBeenCalledWith({ where: { id: 'snapshot-a' } });
    });

    it('rejects invalid cents and malformed dates before any database changes', async () => {
        for (const amountInCents of ['-100', '1.5', '999999999999999999999']) {
            await expect(correctInvestmentSnapshot(db, 'owner-a', 'investment-a', 'snapshot-a', {
                amountInCents, recordedAt: '2026-11-15',
            })).rejects.toThrow();
        }
        expect(updateSnapshot).not.toHaveBeenCalled();
    });
});
