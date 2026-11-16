import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';

type Database = Pick<PrismaClient, 'expense' | 'income'>;
type RecurrenceKind = 'expense' | 'income';

const dateSchema = z.iso.date();

export async function endOwnedRecurrence(
    database: Database,
    userId: string,
    kind: RecurrenceKind,
    sourceId: string,
    endDate: string,
) {
    if (!userId.trim() || !sourceId.trim()) {
        throw new Error('Authenticated owner and record ID are required');
    }

    const validatedDate = dateSchema.parse(endDate);
    const endsOn = new Date(`${validatedDate}T00:00:00.000Z`);

    if (kind === 'expense') {
        const expense = await database.expense.findFirst({
            where: { id: sourceId, userId },
            select: {
                id: true,
                type: true,
                installments: true,
                date: true,
                createdAt: true,
            },
        });

        if (!expense) {
            throw new Error('Record not found');
        }

        if (expense.type !== 'FIXED' || expense.installments !== 1) {
            throw new Error('Not a recurring record');
        }

        const startsOn = expense.date ?? expense.createdAt;

        if (endsOn.getTime() < Date.UTC(
            startsOn.getUTCFullYear(),
            startsOn.getUTCMonth(),
            startsOn.getUTCDate(),
        )) {
            throw new Error('End date precedes start date');
        }

        return database.expense.update({
            where: { id: sourceId, userId },
            data: { endsOn },
        });
    }

    const income = await database.income.findFirst({
        where: { id: sourceId, userId },
        select: { id: true, type: true, date: true },
    });

    if (!income) {
        throw new Error('Record not found');
    }

    if (income.type !== 'RECURRING') {
        throw new Error('Not a recurring record');
    }

    if (income.date && endsOn < income.date) {
        throw new Error('End date precedes start date');
    }

    return database.income.update({
        where: { id: sourceId, userId },
        data: { endsOn },
    });
}
