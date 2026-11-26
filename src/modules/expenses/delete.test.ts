import { expect, it, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { deleteArchivedExpense } from './delete';

it.each([[1, null, 'deleted'], [0, { id: 'a' }, 'protected'], [0, null, 'not-found']] as const)('guards deletion with ownership, archive and history predicates', async (count, existing, expected) => {
    const deleteMany = vi.fn().mockResolvedValue({ count });
    const findFirst = vi.fn().mockResolvedValue(existing);
    const database = { expense: { deleteMany, findFirst } } as unknown as Pick<PrismaClient, 'expense'>;
    expect(await deleteArchivedExpense(database, 'owner', 'a')).toBe(expected);
    expect(deleteMany).toHaveBeenCalledWith({ where: { id: 'a', userId: 'owner', archivedAt: { not: null }, linkedTransactionId: null, occurrences: { none: {} } } });
    if (!count) expect(findFirst).toHaveBeenCalledWith({ where: { id: 'a', userId: 'owner' }, select: { id: true } });
});
