import type { PrismaClient } from '@prisma/client';

type CategoryDatabase = Pick<PrismaClient, 'category'>;

function requireOwnerId(userId: string) {
    if (!userId.trim()) {
        throw new Error('Authenticated user ID is required');
    }
}

export async function listCategories(
    database: CategoryDatabase,
    userId: string,
) {
    requireOwnerId(userId);

    return database.category.findMany({
        where: {
            userId,
        },
        orderBy: {
            name: 'asc',
        },
        select: {
            id: true,
            name: true,
        },
    });
}

export async function createCategory(
    database: CategoryDatabase,
    userId: string,
    name: string,
) {
    requireOwnerId(userId);

    const normalizedName = name.trim();

    if (normalizedName.length < 1 || normalizedName.length > 100) {
        throw new Error('Category name must contain between 1 and 100 characters');
    }

    return database.category.create({
        data: {
            userId,
            name: normalizedName,
        },
        select: {
            id: true,
            name: true,
        },
    });
}
