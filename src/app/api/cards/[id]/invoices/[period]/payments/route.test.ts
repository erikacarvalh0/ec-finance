import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    requireCurrentUserId: vi.fn(),
    getInvoicePaymentSummary: vi.fn(),
    recordInvoicePayment: vi.fn(),
    transaction: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
    prisma: {
        $transaction: mocks.transaction,
    },
}));

vi.mock('@/lib/auth/require-user', () => {
    class UnauthorizedError extends Error {}

    return {
        UnauthorizedError,
        requireCurrentUserId: mocks.requireCurrentUserId,
    };
});

vi.mock('@/modules/cards/payment-service', () => ({
    getInvoicePaymentSummary: mocks.getInvoicePaymentSummary,
    recordInvoicePayment: mocks.recordInvoicePayment,
}));

import { UnauthorizedError } from '@/lib/auth/require-user';
import { GET, POST } from './route';

const params = {
    params: Promise.resolve({ id: 'card-a', period: '2026-11' }),
};

function request(data: unknown) {
    return new Request('http://localhost/api/cards/card-a/invoices/2026-11/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
}

describe('invoice payment API', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.transaction.mockImplementation(async (callback) => callback({}));
    });

    it('requires an authenticated session for invoice payment reads and writes', async () => {
        mocks.requireCurrentUserId.mockRejectedValue(new UnauthorizedError());

        expect((await GET(new Request('http://localhost'), params)).status).toBe(401);
        expect((await POST(request({}), params)).status).toBe(401);
        expect(mocks.transaction).not.toHaveBeenCalled();
    });

    it('lists payments and serializes monetary values', async () => {
        mocks.requireCurrentUserId.mockResolvedValue('owner-a');
        mocks.getInvoicePaymentSummary.mockResolvedValue({
            summary: {
                status: 'PARTIALLY_PAID',
                totalInCents: BigInt(10000),
                paidInCents: BigInt(3000),
                balanceInCents: BigInt(7000),
            },
            payments: [{
                id: 'payment-a',
                amountInCents: BigInt(3000),
                paidAt: new Date('2026-11-16T00:00:00.000Z'),
            }],
        });

        const response = await GET(new Request('http://localhost'), params);
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.summary.balanceInCents).toBe('7000');
        expect(body.payments[0].amountInCents).toBe('3000');
        expect(mocks.getInvoicePaymentSummary).toHaveBeenCalledWith(
            expect.anything(), 'owner-a', 'card-a', '2026-11',
        );
    });

    it('records payments with the server owner in a transaction', async () => {
        mocks.requireCurrentUserId.mockResolvedValue('owner-a');
        mocks.recordInvoicePayment.mockResolvedValue({
            id: 'payment-a',
            amountInCents: BigInt(3000),
            paidAt: new Date('2026-11-16T00:00:00.000Z'),
        });

        const response = await POST(request({
            amountInCents: '3000',
            paidAt: '2026-11-16',
            idempotencyKey: 'unique-payment-a',
            userId: 'forged-user',
        }), params);

        expect(response.status).toBe(201);
        expect(mocks.recordInvoicePayment).toHaveBeenCalledWith(
            expect.anything(), 'owner-a', 'card-a', '2026-11',
            expect.objectContaining({ userId: 'forged-user' }),
        );
    });

    it('returns a conflict instead of recording an overpayment', async () => {
        mocks.requireCurrentUserId.mockResolvedValue('owner-a');
        mocks.recordInvoicePayment.mockRejectedValue(
            new Error('Payment exceeds remaining invoice balance'),
        );

        const response = await POST(request({}), params);

        expect(response.status).toBe(409);
    });
});
