import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';

export const preferencesSchema = z.object({
    currency: z.enum(['BRL', 'USD', 'EUR']),
    theme: z.enum(['LIGHT', 'DARK', 'SYSTEM']),
    billReminders: z.boolean(),
    monthlySummary: z.boolean(),
}).strict();

export type Preferences = z.infer<typeof preferencesSchema>;

export const defaultPreferences: Readonly<Preferences> = Object.freeze({
    currency: 'BRL',
    theme: 'LIGHT',
    billReminders: true,
    monthlySummary: true,
});

type Database = Pick<PrismaClient, 'userPreferences'>;

const select = {
    currency: true,
    theme: true,
    billReminders: true,
    monthlySummary: true,
} as const;

function assertUser(userId: string) {
    if (!userId.trim()) throw new Error('User required');
}

export async function getPreferences(database: Database, userId: string): Promise<Preferences> {
    assertUser(userId);
    const stored = await database.userPreferences.findUnique({ where: { userId }, select });
    return stored ?? { ...defaultPreferences };
}

export async function savePreferences(database: Database, userId: string, input: unknown): Promise<Preferences> {
    assertUser(userId);
    const preferences = preferencesSchema.parse(input);
    return database.userPreferences.upsert({
        where: { userId },
        create: { userId, ...preferences },
        update: preferences,
        select,
    });
}
