import { describe, expect, it, vi } from 'vitest';
import { listUserTransactions } from './repository';

describe('listUserTransactions', () => {
  it('limits every query to the authenticated owner', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const database = {
      transaction: {
        findMany,
      },
    } as unknown as Parameters<typeof listUserTransactions>[0];

    await listUserTransactions(database, 'user-a');

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: 'user-a',
        },
      }),
    );
  });

  it('rejects a missing authenticated user ID', async () => {
    const findMany = vi.fn();
    const database = {
      transaction: {
        findMany,
      },
    } as unknown as Parameters<typeof listUserTransactions>[0];

    await expect(listUserTransactions(database, '')).rejects.toThrow(
      'Authenticated user ID is required',
    );
    expect(findMany).not.toHaveBeenCalled();
  });
});
