import { beforeEach, describe, expect, it, vi } from 'vitest';
import { calculateGoalProgress, createFinancialGoal, listFinancialGoals } from './service';

const create = vi.fn();
const findMany = vi.fn();
const db = { financialGoal: { create, findMany } } as unknown as Parameters<typeof createFinancialGoal>[0];

describe('financial goals', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        create.mockImplementation(async ({ data }) => ({ id: 'goal-a', ...data }));
        findMany.mockResolvedValue([]);
    });

    it('rejects invalid amounts and deadlines before writing', async () => {
        await expect(createFinancialGoal(db, 'owner-a', {
            name: 'Trip', targetInCents: '0', savedInCents: '0',
        })).rejects.toThrow();
        await expect(createFinancialGoal(db, 'owner-a', {
            name: 'Trip', targetInCents: '100', savedInCents: '200',
        })).rejects.toThrow();
        await expect(createFinancialGoal(db, 'owner-a', {
            name: 'Trip', targetInCents: '100', savedInCents: '0', deadline: '2026-02-30',
        })).rejects.toThrow();
        expect(create).not.toHaveBeenCalled();
    });

    it('creates a goal scoped to the authenticated owner', async () => {
        await createFinancialGoal(db, 'owner-a', {
            name: '  Emergency fund  ', targetInCents: '4500000',
            savedInCents: '500000', deadline: '2027-12-31',
        });
        expect(create).toHaveBeenCalledWith({ data: {
            userId: 'owner-a', name: 'Emergency fund',
            targetInCents: BigInt(4500000), savedInCents: BigInt(500000),
            deadline: new Date('2027-12-31T00:00:00.000Z'),
        } });
    });

    it('reads only goals belonging to the authenticated owner', async () => {
        await listFinancialGoals(db, 'owner-a');
        expect(findMany).toHaveBeenCalledWith({
            where: { userId: 'owner-a' },
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        });
    });

    it('calculates bounded progress with exact bigint arithmetic', () => {
        expect(calculateGoalProgress(BigInt(1), BigInt(3))).toEqual({
            percentage: 33, remainingInCents: BigInt(2),
        });
        expect(calculateGoalProgress(BigInt(120), BigInt(100))).toEqual({
            percentage: 100, remainingInCents: BigInt(0),
        });
    });

    it('rejects anonymous access', async () => {
        await expect(listFinancialGoals(db, ' ')).rejects.toThrow();
        expect(findMany).not.toHaveBeenCalled();
    });
});
