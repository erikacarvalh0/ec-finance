import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { recordInvestmentCashflow } from './cashflows';
import { summarizeInvestmentPerformance } from './performance';

if (!(process.env.DATABASE_URL ?? '').includes('ec_finance_test')) {
    throw new Error('Investment cashflow integration requires ec_finance_test.');
}

const prisma = new PrismaClient();
const unique = randomUUID();

describe('PostgreSQL investment cashflows', () => {
    let ownerId = '';
    let otherId = '';
    let investmentId = '';

    beforeAll(async () => {
        const owner = await prisma.user.create({
            data: { email: `cashflow-owner-${unique}@example.test` },
        });
        const other = await prisma.user.create({
            data: { email: `cashflow-other-${unique}@example.test` },
        });
        ownerId = owner.id;
        otherId = other.id;

        const investment = await prisma.investment.create({
            data: { userId: ownerId, name: 'Emergency savings' },
        });
        investmentId = investment.id;

        await prisma.investmentSnapshot.createMany({
            data: [
                {
                    userId: ownerId,
                    investmentId,
                    amountInCents: BigInt(100000),
                    recordedAt: new Date('2026-11-01T00:00:00.000Z'),
                },
                {
                    userId: ownerId,
                    investmentId,
                    amountInCents: BigInt(125000),
                    recordedAt: new Date('2026-11-30T00:00:00.000Z'),
                },
            ],
        });
    });

    afterAll(async () => {
        if (ownerId && otherId) {
            await prisma.user.deleteMany({
                where: { id: { in: [ownerId, otherId] } },
            });
        }
        await prisma.$disconnect();
    });

    it('persists deposits and withdrawals independently of valuation records', async () => {
        const deposit = await recordInvestmentCashflow(prisma, ownerId, investmentId, {
            type: 'DEPOSIT',
            amountInCents: '20000',
            occurredAt: '2026-11-15',
        });
        const withdrawal = await recordInvestmentCashflow(prisma, ownerId, investmentId, {
            type: 'WITHDRAWAL',
            amountInCents: '5000',
            occurredAt: '2026-11-20',
        });

        const [valuations, cashflows] = await Promise.all([
            prisma.investmentSnapshot.findMany({
                where: { userId: ownerId, investmentId },
                orderBy: { recordedAt: 'asc' },
            }),
            prisma.investmentCashflow.findMany({
                where: { userId: ownerId, investmentId },
                orderBy: { occurredAt: 'asc' },
            }),
        ]);

        expect(cashflows.map((flow) => flow.id)).toEqual([deposit.id, withdrawal.id]);
        expect(valuations).toHaveLength(2);
        expect(summarizeInvestmentPerformance(valuations, cashflows))
            .toEqual({
                currentBalanceInCents: BigInt(125000),
                depositedInCents: BigInt(20000),
                withdrawnInCents: BigInt(5000),
                netCashflowInCents: BigInt(15000),
                estimatedGainInCents: BigInt(10000),
            });
    });

    it('prevents cross-user writes in service and composite database constraints', async () => {
        await expect(recordInvestmentCashflow(prisma, otherId, investmentId, {
            type: 'DEPOSIT', amountInCents: '100', occurredAt: '2026-11-15',
        })).rejects.toThrow('Investment not found');

        await expect(prisma.investmentCashflow.create({
            data: {
                userId: otherId,
                investmentId,
                type: 'WITHDRAWAL',
                amountInCents: BigInt(100),
                occurredAt: new Date('2026-11-15T00:00:00.000Z'),
            },
        })).rejects.toThrow();

        expect(await prisma.investmentCashflow.count({
            where: { userId: otherId },
        })).toBe(0);
    });

    it('rejects zero or negative investment cashflows at the database level', async () => {
        await expect(prisma.investmentCashflow.create({
            data: {
                userId: ownerId,
                investmentId,
                type: 'DEPOSIT',
                amountInCents: BigInt(0),
                occurredAt: new Date('2026-11-15T00:00:00.000Z'),
            },
        })).rejects.toThrow();
    });
});
