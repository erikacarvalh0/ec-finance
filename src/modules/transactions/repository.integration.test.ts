import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { listUserTransactions } from './repository';
import { createExpense, createIncome, createInvestment, addInvestmentSnapshot, listInvestments } from '@/modules/finance/service';
import { markCardTransactionFixed, classifyImportedCardTransaction } from '@/modules/finance/fixed-expenses-service';
import { createManualTransaction } from './create';
import { createCategory } from '@/modules/categories/service';

const databaseUrl = process.env.DATABASE_URL ?? '';

if (!databaseUrl.includes('ec_finance_test')) {
    throw new Error(
        'Integration tests require a dedicated ec_finance_test PostgreSQL database.',
    );
}

const prisma = new PrismaClient();
const runId = randomUUID();

describe('PostgreSQL tenant isolation', () => {
    let ownerId: string;
    let otherUserId: string;
    let ownerConnectionId: string;
    let otherConnectionId: string;
    let ownerCardId: string;
    let otherCardId: string;
    let otherCategoryId: string;

    beforeAll(async () => {
        const owner = await prisma.user.create({
            data: {
                email: `owner-${runId}@example.test`,
            },
        });
        const otherUser = await prisma.user.create({
            data: {
                email: `other-${runId}@example.test`,
            },
        });

        ownerId = owner.id;
        otherUserId = otherUser.id;

        const ownerConnection = await prisma.bankConnection.create({
            data: {
                userId: ownerId,
                provider: 'test-provider',
                externalItemId: `owner-${runId}`,
            },
        });
        const otherConnection = await prisma.bankConnection.create({
            data: {
                userId: otherUserId,
                provider: 'test-provider',
                externalItemId: `other-${runId}`,
            },
        });

        ownerConnectionId = ownerConnection.id;
        otherConnectionId = otherConnection.id;

        const ownerCard = await prisma.creditCard.create({
            data: {
                userId: ownerId,
                connectionId: ownerConnectionId,
                externalAccountId: `owner-card-${runId}`,
                name: 'Owner credit card',
            },
        });
        const otherCard = await prisma.creditCard.create({
            data: {
                userId: otherUserId,
                connectionId: otherConnectionId,
                externalAccountId: `other-card-${runId}`,
                name: 'Other credit card',
            },
        });

        ownerCardId = ownerCard.id;
        otherCardId = otherCard.id;

        const otherCategory = await prisma.category.create({
            data: {
                userId: otherUserId,
                name: `Other category ${runId}`,
            },
        });
        otherCategoryId = otherCategory.id;

        await prisma.transaction.createMany({
            data: [
                {
                    userId: ownerId,
                    cardId: ownerCardId,
                    providerTransactionId: `owner-1-${runId}`,
                    description: 'Owner groceries',
                    amountInCents: BigInt(12900),
                    occurredAt: new Date('2026-11-10T12:00:00.000Z'),
                },
                {
                    userId: ownerId,
                    cardId: ownerCardId,
                    providerTransactionId: `owner-2-${runId}`,
                    description: 'Owner transport',
                    amountInCents: BigInt(2550),
                    occurredAt: new Date('2026-11-12T12:00:00.000Z'),
                },
                {
                    userId: otherUserId,
                    cardId: otherCardId,
                    providerTransactionId: `other-1-${runId}`,
                    description: 'Other private purchase',
                    amountInCents: BigInt(89900),
                    occurredAt: new Date('2026-11-13T12:00:00.000Z'),
                },
            ],
        });
    });

    afterAll(async () => {
        if (ownerId && otherUserId) {
            await prisma.user.deleteMany({
                where: {
                    id: {
                        in: [ownerId, otherUserId],
                    },
                },
            });
        }
        await prisma.$disconnect();
    });

    it('returns only the signed-in user transactions, newest first', async () => {
        const transactions = await listUserTransactions(prisma, ownerId);

        expect(transactions.map((transaction) => transaction.description)).toEqual([
            'Owner transport',
            'Owner groceries',
        ]);
        expect(transactions.every((transaction) =>
            transaction.description !== 'Other private purchase',
        )).toBe(true);
    });

    it('rejects linking another user credit card to a transaction', async () => {
        await expect(prisma.transaction.create({
            data: {
                userId: ownerId,
                cardId: otherCardId,
                providerTransactionId: `invalid-card-${runId}`,
                description: 'Invalid ownership',
                amountInCents: BigInt(100),
                occurredAt: new Date(),
            },
        })).rejects.toThrow();
    });

    it('rejects linking another user category to a transaction', async () => {
        await expect(prisma.transaction.create({
            data: {
                userId: ownerId,
                cardId: ownerCardId,
                categoryId: otherCategoryId,
                providerTransactionId: `invalid-category-${runId}`,
                description: 'Invalid ownership',
                amountInCents: BigInt(100),
                occurredAt: new Date(),
            },
        })).rejects.toThrow();
    });

    it('rejects linking a credit card to another user bank connection', async () => {
        await expect(prisma.creditCard.create({
            data: {
                userId: ownerId,
                connectionId: otherConnectionId,
                externalAccountId: `invalid-connection-${runId}`,
                name: 'Invalid ownership',
            },
        })).rejects.toThrow();
    });
    it('persists category and manual transactions for the correct owner', async () => {
        const category = await createCategory(
            prisma,
            ownerId,
            ` Groceries ${runId} `,
        );

        const transaction = await createManualTransaction(prisma, ownerId, {
            cardId: ownerCardId,
            categoryId: category.id,
            description: 'Manually added groceries',
            amountInCents: '7500',
            occurredAt: '2026-11-15T13:00:00.000Z',
        });

        expect(category.name).toBe(`Groceries ${runId}`);
        expect(transaction.amountInCents).toBe(BigInt(7500));

        const ownerRecords = await listUserTransactions(prisma, ownerId);
        const otherRecords = await listUserTransactions(prisma, otherUserId);

        expect(ownerRecords.some((record) => record.id === transaction.id)).toBe(true);
        expect(otherRecords.some((record) => record.id === transaction.id)).toBe(false);
    });

    it('rejects cross-tenant manual writes before inserting records', async () => {
        await expect(createManualTransaction(prisma, ownerId, {
            cardId: otherCardId,
            categoryId: null,
            description: 'Forbidden transaction',
            amountInCents: '500',
            occurredAt: '2026-11-15T13:00:00.000Z',
        })).rejects.toThrow('Credit card not found');
    });

    it('persists expenses and incomes only for their owner', async () => {
        const expense = await createExpense(prisma, ownerId, {
            description: 'Electricity',
            amountInCents: '15000',
            type: 'FIXED',
            paymentMethod: 'AUTOMATIC_DEBIT',
            date: '2026-11-15',
        });
        const income = await createIncome(prisma, ownerId, {
            type: 'RECURRING',
            amountInCents: '250000',
            responsible: 'Tenant',
            description: 'Monthly rental payment',
            date: '2026-11-15',
        });

        expect(expense.installments).toBe(1);
        expect(income.responsible).toBe('Tenant');
        expect(await prisma.expense.count({ where: { userId: otherUserId } })).toBe(0);
        expect(await prisma.income.count({ where: { userId: otherUserId } })).toBe(0);
    });

    it('stores investment valuations chronologically and protects other owners', async () => {
        const investment = await createInvestment(prisma, ownerId, {
            name: 'Emergency caixinha',
        });

        await addInvestmentSnapshot(prisma, ownerId, investment.id, {
            amountInCents: '100000',
            recordedAt: '2026-11-10',
        });
        await addInvestmentSnapshot(prisma, ownerId, investment.id, {
            amountInCents: '95000',
            recordedAt: '2026-11-15',
        });

        const investments = await listInvestments(prisma, ownerId);
        const owned = investments.find((item) => item.id === investment.id);

        expect(owned?.snapshots.map((item) => item.amountInCents)).toEqual([
            BigInt(100000),
            BigInt(95000),
        ]);
        expect(await listInvestments(prisma, otherUserId)).toEqual([]);

        await expect(addInvestmentSnapshot(prisma, otherUserId, investment.id, {
            amountInCents: '500',
            recordedAt: '2026-11-16',
        })).rejects.toThrow('Investment not found');
    });

    it('reuses a manually fixed card merchant rule for a later import', async () => {
        const original = await prisma.transaction.findFirstOrThrow({
            where: {
                userId: ownerId,
                cardId: ownerCardId,
            },
        });

        await markCardTransactionFixed(prisma, ownerId, original.id);

        const fixed = await classifyImportedCardTransaction(prisma, {
            userId: ownerId,
            cardId: ownerCardId,
            description: original.description,
        });
        const otherOwnerFixed = await classifyImportedCardTransaction(prisma, {
            userId: otherUserId,
            cardId: otherCardId,
            description: original.description,
        });

        expect(fixed).toBe(true);
        expect(otherOwnerFixed).toBe(false);
    });

});
