import type { PrismaClient } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { defaultPreferences, getPreferences, savePreferences } from './preferences';

function database() {
    const findUnique = vi.fn();
    const upsert = vi.fn();
    return { findUnique, upsert, client: { userPreferences: { findUnique, upsert } } as unknown as Pick<PrismaClient, 'userPreferences'> };
}

describe('user preferences', () => {
    it('returns defaults for a new user without writing on read', async () => {
        const db = database();
        db.findUnique.mockResolvedValue(null);
        expect(await getPreferences(db.client, 'user-a')).toEqual(defaultPreferences);
        expect(db.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'user-a' } }));
        expect(db.upsert).not.toHaveBeenCalled();
    });

    it('returns saved preferences including false notification values', async () => {
        const db = database();
        const saved = { ...defaultPreferences, billReminders: false, monthlySummary: false };
        db.findUnique.mockResolvedValue(saved);
        expect(await getPreferences(db.client, 'user-a')).toEqual(saved);
    });

    it('upserts only for the authenticated owner', async () => {
        const db = database();
        const input = { ...defaultPreferences, theme: 'DARK', billReminders: false };
        db.upsert.mockResolvedValue(input);
        expect(await savePreferences(db.client, 'user-a', input)).toEqual(input);
        expect(db.upsert).toHaveBeenCalledWith(expect.objectContaining({
            where: { userId: 'user-a' },
            create: { userId: 'user-a', ...input },
            update: input,
        }));
    });

    it.each([
        { ...defaultPreferences, userId: 'user-b' },
        { ...defaultPreferences, currency: 'BTC' },
        { ...defaultPreferences, theme: 'unknown' },
        { ...defaultPreferences, billReminders: 'false' },
        { currency: 'BRL' },
        null,
    ])('rejects invalid or incomplete payloads without writing: %j', async input => {
        const db = database();
        await expect(savePreferences(db.client, 'user-a', input)).rejects.toThrow();
        expect(db.upsert).not.toHaveBeenCalled();
    });

    it('rejects missing owners', async () => {
        const db = database();
        await expect(getPreferences(db.client, '')).rejects.toThrow();
        await expect(savePreferences(db.client, '', defaultPreferences)).rejects.toThrow();
        expect(db.findUnique).not.toHaveBeenCalled();
        expect(db.upsert).not.toHaveBeenCalled();
    });
});
