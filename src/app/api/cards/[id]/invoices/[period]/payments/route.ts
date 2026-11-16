import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireCurrentUserId, UnauthorizedError } from '@/lib/auth/require-user';
import {
    getInvoicePaymentSummary,
    recordInvoicePayment,
} from '@/modules/cards/payment-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string; period: string }> };

function serializePayment(payment: {
    id: string;
    amountInCents: bigint;
    paidAt: Date;
}) {
    return {
        id: payment.id,
        amountInCents: payment.amountInCents.toString(),
        paidAt: payment.paidAt.toISOString().slice(0, 10),
    };
}

function handleError(error: unknown) {
    if (error instanceof UnauthorizedError) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (error instanceof Error && error.message === 'Card not found') {
        return Response.json({ error: 'Card not found' }, { status: 404 });
    }

    if (error instanceof Error && (
        error.message === 'Payment exceeds remaining invoice balance'
        || error.message === 'Payment request key already used'
        || error.message === 'Payments exceed invoice total'
    )) {
        return Response.json({ error: error.message }, { status: 409 });
    }

    if (error instanceof Error && (
        error.message === 'Invalid invoice period'
        || error.message === 'Card billing cycle is not configured'
        || error.message === 'Payment exceeds the supported range'
    ) || error instanceof z.ZodError || error instanceof SyntaxError) {
        return Response.json({ error: 'Invalid invoice payment data' }, { status: 400 });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError
        && (error.code === 'P2002' || error.code === 'P2034')) {
        return Response.json({ error: 'Payment update conflict; retry the request' }, { status: 409 });
    }

    throw error;
}

export async function GET(_request: Request, { params }: Context) {
    try {
        const userId = await requireCurrentUserId();
        const { id, period } = await params;
        const record = await getInvoicePaymentSummary(prisma, userId, id, period);

        return Response.json({
            summary: {
                ...record.summary,
                totalInCents: record.summary.totalInCents.toString(),
                paidInCents: record.summary.paidInCents.toString(),
                balanceInCents: record.summary.balanceInCents.toString(),
            },
            payments: record.payments.map(serializePayment),
        }, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
        return handleError(error);
    }
}

export async function POST(request: Request, { params }: Context) {
    try {
        const userId = await requireCurrentUserId();
        const { id, period } = await params;
        const input = await request.json();

        const payment = await prisma.$transaction(
            async (transaction) => recordInvoicePayment(
                transaction,
                userId,
                id,
                period,
                input,
            ),
            { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );

        return Response.json({ payment: serializePayment(payment) }, {
            status: 201,
            headers: { 'Cache-Control': 'no-store' },
        });
    } catch (error) {
        return handleError(error);
    }
}
