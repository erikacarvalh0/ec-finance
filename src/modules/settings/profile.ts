import type { PrismaClient } from '@prisma/client';
import { profileUpdateSchema } from './profile-validation';

type Database = Pick<PrismaClient, 'user'>;
const select = { name: true, email: true } as const;

export async function updateProfile(database: Database, userId: string, input: unknown) {
    if (!userId.trim()) throw new Error('User required');
    const data = profileUpdateSchema.parse(input);
    return database.user.update({ where: { id: userId }, data, select });
}
