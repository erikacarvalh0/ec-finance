import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { getSecuritySettings } from './security';

describe('getSecuritySettings', () => {
    it('only selects the authenticated user Google provider, not tokens', async () => {
        const findFirst = vi.fn().mockResolvedValue({ provider: 'google' });
        const db = { account: { findFirst } } as unknown as PrismaClient;
        expect(await getSecuritySettings(db, 'owner')).toEqual({ googleConnected: true });
        expect(findFirst).toHaveBeenCalledWith({ where: { userId: 'owner', provider: 'google' }, select: { provider: true } });
    });
    it('does not assume Google linkage when no account exists', async () => {
        const findFirst = vi.fn().mockResolvedValue(null);
        const db = { account: { findFirst } } as unknown as PrismaClient;
        expect(await getSecuritySettings(db, 'owner')).toEqual({ googleConnected: false });
        await expect(getSecuritySettings(db, ' ')).rejects.toThrow('User required');
        expect(findFirst).toHaveBeenCalledTimes(1);
    });
});
