import { beforeEach, describe, expect, it, vi } from 'vitest';
import { configureCardCycle, getUserCardInvoice, linkManualCardExpense } from './service';

const cardFind = vi.fn();
const cardUpdate = vi.fn();
const transactionFind = vi.fn();
const expenseFind = vi.fn();
const expenseUpdate = vi.fn();
const transactionList = vi.fn();
const expenseList = vi.fn();

const database = {
    creditCard: { findFirst: cardFind, update: cardUpdate },
    transaction: { findFirst: transactionFind, findMany: transactionList },
    expense: { findFirst: expenseFind, update: expenseUpdate, findMany: expenseList },
} as unknown as Parameters<typeof configureCardCycle>[0];

describe('card ownership and invoice data', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        cardFind.mockResolvedValue({ id: 'card-a', closingDay: 10, dueDay: 20 });
        transactionList.mockResolvedValue([]);
        expenseList.mockResolvedValue([]);
    });

    it('configures closing and due days only on an owned card', async () => {
        await configureCardCycle(database, 'owner-a', 'card-a', {
            closingDay: 10,
            dueDay: 20,
        });

        expect(cardUpdate).toHaveBeenCalledWith({
            where: { id: 'card-a', userId: 'owner-a' },
            data: { closingDay: 10, dueDay: 20 },
        });
    });

    it('rejects invalid calendar days and foreign cards', async () => {
        await expect(configureCardCycle(database, 'owner-a', 'card-a', {
            closingDay: 0,
            dueDay: 20,
        })).rejects.toThrow();

        cardFind.mockResolvedValue(null);

        await expect(configureCardCycle(database, 'owner-a', 'card-b', {
            closingDay: 10,
            dueDay: 20,
        })).rejects.toThrow('Card not found');

        expect(cardUpdate).not.toHaveBeenCalled();
    });

    it('reads only transactions and expenses owned by the session user and card', async () => {
        await getUserCardInvoice(database, 'owner-a', 'card-a', '2026-11');

        expect(transactionList).toHaveBeenCalledWith(expect.objectContaining({
            where: expect.objectContaining({ userId: 'owner-a', cardId: 'card-a' }),
        }));
        expect(expenseList).toHaveBeenCalledWith(expect.objectContaining({
            where: expect.objectContaining({
                userId: 'owner-a',
                cardId: 'card-a',
                paymentMethod: 'CREDIT',
            }),
        }));
    });

    it('allows an explicit link only for an expense and transaction on the same owned card', async () => {
        expenseFind.mockResolvedValue({
            id: 'expense-a',
            paymentMethod: 'CREDIT',
            cardId: 'card-a',
            linkedTransactionId: null,
        });
        transactionFind.mockResolvedValue({ id: 'import-a', cardId: 'card-a' });

        await linkManualCardExpense(database, 'owner-a', 'expense-a', 'import-a');

        expect(expenseUpdate).toHaveBeenCalledWith({
            where: { id: 'expense-a', userId: 'owner-a' },
            data: { linkedTransactionId: 'import-a' },
        });
    });

    it('rejects links across cards or across users', async () => {
        expenseFind.mockResolvedValue({
            id: 'expense-a',
            paymentMethod: 'CREDIT',
            cardId: 'card-a',
            linkedTransactionId: null,
        });
        transactionFind.mockResolvedValue({ id: 'import-b', cardId: 'card-b' });

        await expect(linkManualCardExpense(database, 'owner-a', 'expense-a', 'import-b'))
            .rejects.toThrow('Card mismatch');
        expect(expenseUpdate).not.toHaveBeenCalled();
    });
});
