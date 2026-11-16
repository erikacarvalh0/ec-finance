import { beforeEach, describe, expect, it, vi } from 'vitest';
import { recordInvoicePayment } from './payment-service';

const findCard = vi.fn();
const findPurchases = vi.fn();
const findExpenses = vi.fn();
const listPayments = vi.fn();
const findCardForSummary = vi.fn();
const insertPayment = vi.fn();
const findExisting = vi.fn();
const db = {
    creditCard: { findFirst: findCard },
    transaction: { findMany: findPurchases },
    expense: { findMany: findExpenses },
    invoicePayment: { findMany: listPayments, findUnique: findExisting, create: insertPayment },
} as unknown as Parameters<typeof recordInvoicePayment>[0];

describe('recording manual invoice payments', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        findCard.mockResolvedValue({ id: 'card-a', closingDay: 10, dueDay: 20 });
        findPurchases.mockResolvedValue([{
            id: 'charge-a',
            description: 'Groceries',
            amountInCents: BigInt(10000),
            occurredAt: new Date('2026-11-08T00:00:00.000Z'),
        }]);
        findExpenses.mockResolvedValue([]);
        listPayments.mockResolvedValue([]);
        findExisting.mockResolvedValue(null);
        insertPayment.mockResolvedValue({
            id: 'payment-a',
            amountInCents: BigInt(3000),
            paidAt: new Date('2026-11-16T00:00:00.000Z'),
        });
    });

    const input = {
        amountInCents: '3000',
        paidAt: '2026-11-16',
        idempotencyKey: 'payment-request-a',
    };

    it('stores a payment scoped to the authenticated owner and invoice', async () => {
        await recordInvoicePayment(db, 'owner-a', 'card-a', '2026-11', input);

        expect(findCard).toHaveBeenCalledWith({
            where: { id: 'card-a', userId: 'owner-a' },
            select: { id: true, closingDay: true, dueDay: true },
        });
        expect(insertPayment).toHaveBeenCalledWith({
            data: expect.objectContaining({
                userId: 'owner-a',
                cardId: 'card-a',
                period: '2026-11',
                idempotencyKey: 'payment-request-a',
                amountInCents: BigInt(3000),
            }),
        });
    });

    it('rejects an overpayment before writing to the database', async () => {
        await expect(recordInvoicePayment(db, 'owner-a', 'card-a', '2026-11', {
            ...input,
            amountInCents: '10001',
        })).rejects.toThrow('Payment exceeds remaining invoice balance');

        expect(insertPayment).not.toHaveBeenCalled();
    });

    it('prevents cross-tenant writes when card ownership fails', async () => {
        findCard.mockResolvedValue(null);

        await expect(recordInvoicePayment(db, 'owner-b', 'card-a', '2026-11', input))
            .rejects.toThrow('Card not found');

        expect(insertPayment).not.toHaveBeenCalled();
    });

    it('returns the existing payment for an identical idempotency key', async () => {
        findExisting.mockResolvedValue({
            id: 'payment-previous',
            userId: 'owner-a',
            cardId: 'card-a',
            period: '2026-11',
            idempotencyKey: 'payment-request-a',
            amountInCents: BigInt(3000),
            paidAt: new Date('2026-11-16T00:00:00.000Z'),
        });

        const result = await recordInvoicePayment(db, 'owner-a', 'card-a', '2026-11', input);

        expect(result.id).toBe('payment-previous');
        expect(insertPayment).not.toHaveBeenCalled();
    });

    it('rejects a reused idempotency key with a different amount', async () => {
        findExisting.mockResolvedValue({
            id: 'payment-previous',
            userId: 'owner-a',
            cardId: 'card-a',
            period: '2026-11',
            idempotencyKey: 'payment-request-a',
            amountInCents: BigInt(2000),
            paidAt: new Date('2026-11-16T00:00:00.000Z'),
        });

        await expect(recordInvoicePayment(db, 'owner-a', 'card-a', '2026-11', input))
            .rejects.toThrow('Payment request key already used');

        expect(insertPayment).not.toHaveBeenCalled();
    });

    it.each(['0', '-100', '1.5', 'abc'])('rejects invalid payment cents %s', async (amountInCents) => {
        await expect(recordInvoicePayment(db, 'owner-a', 'card-a', '2026-11', {
            ...input,
            amountInCents,
        })).rejects.toThrow();

        expect(insertPayment).not.toHaveBeenCalled();
    });
});
