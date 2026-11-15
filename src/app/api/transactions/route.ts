import { prisma } from '@/lib/prisma';
import { requireCurrentUserId, UnauthorizedError } from '@/lib/auth/require-user';
import { listUserTransactions } from '@/modules/transactions/repository';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const userId = await requireCurrentUserId();
    const transactions = await listUserTransactions(prisma, userId);

    return Response.json(
      {
        transactions: transactions.map((transaction) => ({
          ...transaction,
          amountInCents: transaction.amountInCents.toString(),
        })),
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      },
    );
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return Response.json(
        { error: 'Unauthorized' },
        { status: 401 },
      );
    }

    throw error;
  }
}
