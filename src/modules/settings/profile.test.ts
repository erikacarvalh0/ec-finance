import type { PrismaClient } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { updateProfile } from './profile';
import { validateProfileName } from './profile-validation';

describe('profile', () => {
    it('updates only the authenticated user and trims the name', async () => {
        const update = vi.fn().mockResolvedValue({ name: 'Maria Silva', email: 'm@example.com' });
        const db = { user: { update } } as unknown as Pick<PrismaClient, 'user'>;
        expect(await updateProfile(db, 'owner', { name: ' Maria Silva ' })).toEqual({ name: 'Maria Silva', email: 'm@example.com' });
        expect(update).toHaveBeenCalledWith({ where: { id: 'owner' }, data: { name: 'Maria Silva' }, select: { name: true, email: true } });
    });

    it.each([{ name: ' ' }, { name: 'A' }, { name: 'x'.repeat(101) }, { name: 'Maria', email: 'other@example.com' }, { name: 'Maria', userId: 'other' }])('rejects invalid or forbidden updates: %j', async input => {
        const update = vi.fn();
        const db = { user: { update } } as unknown as Pick<PrismaClient, 'user'>;
        await expect(updateProfile(db, 'owner', input)).rejects.toThrow();
        expect(update).not.toHaveBeenCalled();
    });

    it('shares validation with the ECDS input', () => {
        expect(validateProfileName(' ')).toBeTruthy();
        expect(validateProfileName('Maria Silva')).toBeUndefined();
    });
});
