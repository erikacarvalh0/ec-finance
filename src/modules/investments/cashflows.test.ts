import { beforeEach, describe, expect, it, vi } from 'vitest';
import { recordInvestmentCashflow } from './cashflows';

const findInvestment = vi.fn();
const createCashflow = vi.fn();
const db = {
    investment: { findFirst: findInvestment },
    investmentCashflow: { create: createCashflow },
} as unknown as Parameters<typeof recordInvestmentCashflow>[0];

describe('investment cashflow authorization', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        findInvestment.mockResolvedValue({ id: 'owned-investment' });
    });

    it('creates a deposit for the authenticated owner only', async () => {
        await recordInvestmentCashflow(db, 'owner-a', 'investment-a', {
            type: 'DEPOSIT', amountInCents: '75000', occurredAt: '2026-11-15',
        });

        expect(findInvestment).toHaveBeenCalledWith({
            where: { id: 'investment-a', userId: 'owner-a' },
            select: { id: true },
        });
        expect(createCashflow).toHaveBeenCalledWith({
            data: {
                userId: 'owner-a',
                investmentId: 'investment-a',
                type: 'DEPOSIT',
                amountInCents: BigInt(75000),
                occurredAt: new Date('2026-11-15T00:00:00.000Z'),
            },
        });
    });

    it('blocks writes to another user investment', async () => {
        findInvestment.mockResolvedValue(null);
        await expect(recordInvestmentCashflow(db, 'owner-a', 'private', {
            type: 'WITHDRAWAL', amountInCents: '100', occurredAt: '2026-11-15',
        })).rejects.toThrow('Investment not found');
        expect(createCashflow).not.toHaveBeenCalled();
    });

    it.each(['0', '-200', '1.5', '9999999999999999999999'])('rejects invalid cents %s', async amountInCents => {
        await expect(recordInvestmentCashflow(db, 'owner-a', 'investment-a', {
            type: 'DEPOSIT', amountInCents, occurredAt: '2026-11-15',
        })).rejects.toThrow();
        expect(createCashflow).not.toHaveBeenCalled();
    });

    it('rejects invalid cashflow dates', async () => {
        await expect(recordInvestmentCashflow(db, 'owner-a', 'investment-a', {
            type: 'DEPOSIT', amountInCents: '100', occurredAt: '2026-13-15',
        })).rejects.toThrow();
    });
});
