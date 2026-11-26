import type { PrismaClient } from '@prisma/client';

export async function getSecuritySettings(database: Pick<PrismaClient, 'account'>, userId: string) {
    if (!userId.trim()) throw new Error('User required');
    const account = await database.account.findFirst({
        where: { userId, provider: 'google' },
        select: { provider: true },
    });
    return { googleConnected: account?.provider === 'google' };
}
